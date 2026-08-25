// Hand-written for Phase 1/2 (only the tables that exist so far).
// Once the full schema is migrated, replace this file with the output of:
//   supabase gen types typescript --project-id <project-ref> > types/database.types.ts

export type UserRole = 'admin' | 'paper_checker' | 'supervisor' | 'staff';
export type PaymentRateModule = 'paper_checker' | 'supervisor' | 'open_day';
export type ConfirmationStatus = 'pending' | 'confirmed' | 'rejected';
export type PaymentStatus = 'pending' | 'pending_admin_approval' | 'approved' | 'paid';

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
      audit_logs: {
        Row: {
          id: string;
          table_name: string;
          record_id: string;
          field_changed: string | null;
          previous_value: string | null;
          new_value: string | null;
          action: string;
          changed_by: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          table_name: string;
          record_id: string;
          field_changed?: string | null;
          previous_value?: string | null;
          new_value?: string | null;
          action: string;
          changed_by?: string | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          table_name?: string;
          record_id?: string;
          field_changed?: string | null;
          previous_value?: string | null;
          new_value?: string | null;
          action?: string;
          changed_by?: string | null;
          reason?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      paper_checker_records: {
        Row: {
          id: string;
          test_date: string;
          branch_id: string;
          batch_id: string;
          paper_checker_id: string;
          subject_id: string;
          test_name: string;
          student_count: number;
          test_marks: number | null;
          per_paper_price: number;
          answer_key_price: number;
          total_amount: number;
          rate_id: string | null;
          confirmation_status: ConfirmationStatus;
          confirmed_by: string | null;
          confirmed_at: string | null;
          rejection_reason: string | null;
          payment_status: PaymentStatus;
          approved_by: string | null;
          approved_at: string | null;
          paid_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          test_date: string;
          branch_id: string;
          batch_id: string;
          paper_checker_id: string;
          subject_id: string;
          test_name: string;
          student_count: number;
          test_marks?: number | null;
          per_paper_price: number;
          answer_key_price: number;
          rate_id?: string | null;
          confirmation_status?: ConfirmationStatus;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          rejection_reason?: string | null;
          payment_status?: PaymentStatus;
          approved_by?: string | null;
          approved_at?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          test_date?: string;
          branch_id?: string;
          batch_id?: string;
          paper_checker_id?: string;
          subject_id?: string;
          test_name?: string;
          student_count?: number;
          test_marks?: number | null;
          per_paper_price?: number;
          answer_key_price?: number;
          rate_id?: string | null;
          confirmation_status?: ConfirmationStatus;
          confirmed_by?: string | null;
          confirmed_at?: string | null;
          rejection_reason?: string | null;
          payment_status?: PaymentStatus;
          approved_by?: string | null;
          approved_at?: string | null;
          paid_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      log_audit: {
        Args: {
          p_table_name: string;
          p_record_id: string;
          p_action: string;
          p_field_changed?: string | null;
          p_previous_value?: string | null;
          p_new_value?: string | null;
          p_reason?: string | null;
        };
        Returns: undefined;
      };
    };
  };
}
