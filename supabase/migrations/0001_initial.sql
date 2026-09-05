-- Gastos — schema inicial
--
-- Decisiones que reflejan las del cliente (ver docs/test-plan.md):
--  * amount_cents es BIGINT, no NUMERIC ni DOUBLE: el dominio opera en
--    centavos enteros de punta a punta.
--  * id es UUID provisto por el CLIENTE, no generado aquí. Es lo que hace
--    idempotente el upsert y neutraliza el doble tap (BUG-003).
--  * occurred_at es TIMESTAMPTZ y se acompaña de tz_offset_minutes, para poder
--    reconstruir el mes local del usuario del lado del servidor (BUG-002).
--  * deleted_at implementa soft delete: sin él, un borrado offline es
--    indistinguible de un registro que aún no ha sincronizado.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- categories

create table public.categories (
  id          text primary key,
  name        text not null,
  color       text not null check (color ~ '^#[0-9A-Fa-f]{6}$')
);

insert into public.categories (id, name, color) values
  ('comida',      'Comida',      '#F97316'),
  ('transporte',  'Transporte',  '#0EA5E9'),
  ('hogar',       'Hogar',       '#22C55E'),
  ('otros',       'Otros',       '#A855F7');

-- ------------------------------------------------------------------ expenses

create table public.expenses (
  id                 uuid primary key,
  user_id            uuid not null references auth.users(id) on delete cascade,
  amount_cents       bigint not null check (amount_cents <> 0),
  currency           char(3) not null default 'MXN',
  category_id        text not null references public.categories(id),
  occurred_at        timestamptz not null,
  -- Offset en minutos vigente en el dispositivo al registrar el gasto.
  -- Permite derivar el mes local sin depender de la zona del servidor.
  tz_offset_minutes  smallint not null check (tz_offset_minutes between -840 and 840),
  note               text check (char_length(note) <= 280),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  deleted_at         timestamptz
);

-- Mes local calculado, materializado como columna generada para poder
-- indexarlo. Esta es la contraparte en servidor de monthKeyOf().
alter table public.expenses
  add column month_key text
  generated always as (
    -- `occurred_at at time zone 'UTC'` produce un timestamp SIN zona. Es
    -- necesario: to_char() sobre timestamptz depende del TimeZone de la
    -- sesion, no es inmutable, y Postgres lo rechaza en una columna generada.
    to_char(
      (occurred_at at time zone 'UTC') + make_interval(mins => tz_offset_minutes),
      'YYYY-MM'
    )
  ) stored;

create index expenses_user_month_idx
  on public.expenses (user_id, month_key)
  where deleted_at is null;

create index expenses_user_updated_idx
  on public.expenses (user_id, updated_at desc);

-- ----------------------------------------------------------- updated_at hook

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger expenses_touch_updated_at
  before update on public.expenses
  for each row execute function public.touch_updated_at();

-- --------------------------------------------------------------- row security

alter table public.expenses enable row level security;
alter table public.categories enable row level security;

create policy "categorias visibles para usuarios autenticados"
  on public.categories for select
  to authenticated
  using (true);

create policy "cada usuario ve solo sus gastos"
  on public.expenses for select
  to authenticated
  using (auth.uid() = user_id);

create policy "cada usuario inserta solo sus gastos"
  on public.expenses for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "cada usuario modifica solo sus gastos"
  on public.expenses for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------ sync idempotente

/**
 * Upsert idempotente con last-write-wins.
 *
 * Reenviar el mismo gasto es inofensivo: el id viene del cliente y colisiona
 * con el registro existente. La cláusula WHERE implementa el mismo criterio
 * que resolveConflict() en el cliente, para que servidor y dispositivo
 * converjan al mismo resultado.
 */
create or replace function public.sync_expense(
  p_id                uuid,
  p_amount_cents      bigint,
  p_currency          char(3),
  p_category_id       text,
  p_occurred_at       timestamptz,
  p_tz_offset_minutes smallint,
  p_note              text,
  p_updated_at        timestamptz,
  p_deleted_at        timestamptz default null
)
returns public.expenses
language plpgsql
security invoker
as $$
declare
  result public.expenses;
begin
  insert into public.expenses as e (
    id, user_id, amount_cents, currency, category_id,
    occurred_at, tz_offset_minutes, note, updated_at, deleted_at
  )
  values (
    p_id, auth.uid(), p_amount_cents, p_currency, p_category_id,
    p_occurred_at, p_tz_offset_minutes, p_note, p_updated_at, p_deleted_at
  )
  on conflict (id) do update
    set amount_cents      = excluded.amount_cents,
        currency          = excluded.currency,
        category_id       = excluded.category_id,
        occurred_at       = excluded.occurred_at,
        tz_offset_minutes = excluded.tz_offset_minutes,
        note              = excluded.note,
        updated_at        = excluded.updated_at,
        deleted_at        = coalesce(e.deleted_at, excluded.deleted_at)
    -- Solo se aplica si la versión entrante es más reciente. Un reenvío
    -- tardío de una versión vieja no puede pisar una edición nueva.
    where excluded.updated_at > e.updated_at
       or excluded.deleted_at is not null
  returning * into result;

  -- El upsert no devolvió fila: la versión entrante era más vieja y se
  -- descartó. Se regresa el estado actual para que el cliente reconcilie.
  if result is null then
    select * into result from public.expenses where id = p_id;
  end if;

  return result;
end;
$$;

-- ------------------------------------------------------------ pull incremental

/** Devuelve los cambios posteriores a un cursor, para sincronización delta. */
create or replace function public.pull_changes(p_since timestamptz)
returns setof public.expenses
language sql
security invoker
stable
as $$
  select *
  from public.expenses
  where user_id = auth.uid()
    and updated_at > p_since
  order by updated_at asc
  limit 500;
$$;
