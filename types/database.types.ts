// Hand-written for Phase 1 (only the tables that exist so far).
// Once the full schema is migrated, replace this file with the output of:
//   supabase gen types typescript --project-id <project-ref> > types/database.types.ts

export type UserRole = 'admin' | 'paper_checker' | 'supervisor' | 'staff';

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
      };
    };
  };
}
