// Hand-written for Phase 1/2 (only the tables that exist so far).
// Once the full schema is migrated, replace this file with the output of:
//   supabase gen types typescript --project-id <project-ref> > types/database.types.ts

export type UserRole = 'admin' | 'paper_checker' | 'supervisor' | 'staff';
export type PaymentRateModule = 'paper_checker' | 'supervisor' | 'open_day';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          branch_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role?: UserRole;
          branch_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          role?: UserRole;
          branch_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      branches: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      subjects: {
        Row: {
          id: string;
          name: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      batches: {
        Row: {
          id: string;
          name: string;
          branch_id: string | null;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          name: string;
          branch_id?: string | null;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          name?: string;
          branch_id?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      payment_rates: {
        Row: {
          id: string;
          module: PaymentRateModule;
          branch_id: string | null;
          subject_id: string | null;
          per_paper_price: number | null;
          answer_key_price: number | null;
          rate_config: Record<string, unknown> | null;
          effective_date: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          module: PaymentRateModule;
          branch_id?: string | null;
          subject_id?: string | null;
          per_paper_price?: number | null;
          answer_key_price?: number | null;
          rate_config?: Record<string, unknown> | null;
          effective_date: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          module?: PaymentRateModule;
          branch_id?: string | null;
          subject_id?: string | null;
          per_paper_price?: number | null;
          answer_key_price?: number | null;
          rate_config?: Record<string, unknown> | null;
          effective_date?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
