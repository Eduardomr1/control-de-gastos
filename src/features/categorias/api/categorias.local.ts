/**
 * Backend en memoria.
 *
 * Se usa cuando no hay credenciales de Supabase configuradas, para poder
 * desarrollar y correr la suite completa sin depender de un backend.
 * `api/index.ts` elige entre este y el remoto en tiempo de ejecución.
 */

import type { Category } from '@/types/expense';

// El orden es el que se muestra en los chips de Agregar; "Otros" va al final
// por ser el cajón de sastre. Debe coincidir con supabase/migrations.
const CATEGORIES: Category[] = [
  { id: 'comida', name: 'Comida', color: '#F97316' },
  { id: 'transporte', name: 'Transporte', color: '#0EA5E9' },
  { id: 'hogar', name: 'Hogar', color: '#22C55E' },
  { id: 'compras', name: 'Compras', color: '#EC4899' },
  { id: 'salud', name: 'Salud', color: '#14B8A6' },
  { id: 'otros', name: 'Otros', color: '#A855F7' },
];

export async function fetchCategories(): Promise<Category[]> {
  return CATEGORIES;
}
