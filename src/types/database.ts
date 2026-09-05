/**
 * Tipos de la base de datos, alineados con supabase/migrations/0001_initial.sql.
 *
 * Se escriben a mano en lugar de generarlos para mantener el proyecto sin
 * dependencia del CLI de Supabase. Si el schema crece, conviene migrar a
 * `supabase gen types typescript`.
 */

export interface ExpenseRow {
  id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  category_id: string;
  occurred_at: string;
  tz_offset_minutes: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  month_key: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  color: string;
}

export type SyncExpenseArgs = Database['public']['Functions']['sync_expense']['Args'];
export type PullChangesArgs = Database['public']['Functions']['pull_changes']['Args'];

export interface Database {
  public: {
    // supabase-js exige la forma completa del schema para inferir los tipos
    // de rpc() y de las consultas; las secciones vacias son obligatorias.
    Views: { [_ in never]: never };
    Tables: {
      expenses: {
        Row: ExpenseRow;
        Insert: Omit<ExpenseRow, 'created_at' | 'updated_at' | 'month_key'>;
        Update: Partial<ExpenseRow>;
        Relationships: [];
      };
      categories: {
        Row: CategoryRow;
        Insert: CategoryRow;
        Update: Partial<CategoryRow>;
        Relationships: [];
      };
    };
    Functions: {
      sync_expense: {
        Args: {
          p_id: string;
          p_amount_cents: number;
          p_currency: string;
          p_category_id: string;
          p_occurred_at: string;
          p_tz_offset_minutes: number;
          p_note: string | null;
          p_updated_at: string;
          p_deleted_at: string | null;
        };
        Returns: ExpenseRow;
      };
      pull_changes: {
        Args: { p_since: string };
        Returns: ExpenseRow[];
      };
    };
  };
}
