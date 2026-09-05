# Backend (Supabase)

## Aplicar el schema

```bash
npx supabase link --project-ref TU_PROJECT_REF
npx supabase db push
```

O pegar `migrations/0001_initial.sql` en el SQL Editor del panel.

## Variables de entorno

Copiar de Project Settings → API a tu `.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhb...
```

La `anon key` es pública por diseño; lo que protege los datos es Row Level
Security, activo en ambas tablas. La `service_role key` nunca debe llegar al
cliente.

## Verificación de RLS

Vale la pena probarlo explícitamente: crear dos usuarios, insertar un gasto con
cada uno y confirmar que ninguno ve el del otro. Una política mal escrita no
falla, simplemente expone datos.

| Prueba | Esperado |
|---|---|
| Usuario A consulta `expenses` | Solo sus propios gastos |
| Usuario A intenta insertar con `user_id` de B | Rechazado por la política |
| Usuario sin sesión consulta `expenses` | Conjunto vacío |
