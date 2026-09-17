/**
 * Backend contra Supabase.
 */

import type { Category } from '@/types/expense';
import { supabase } from '@/shared/lib/supabase';
import { traducirPostgrest } from '@/shared/errors';
import type { CategoryRow } from '@/types/database';

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase().from('categories').select('*');
  if (error) throw traducirPostgrest(error);

  // El mismo motivo que en callRpc(): la inferencia de supabase-js resuelve
  // el schema a never con tipos escritos a mano. El cast queda acotado a esta
  // linea y CategoryRow refleja la tabla real.
  return ((data ?? []) as CategoryRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    color: row.color,
  }));
}
