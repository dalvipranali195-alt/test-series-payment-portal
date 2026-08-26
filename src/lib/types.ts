export type UserRole =
  | "admin"
  | "paper_checker"
  | "supervisor"
  | "staff_coordinator"
  | "accounts";

export type ModuleType = "paper_checker" | "supervisor" | "open_day";

export type RecordStatus =
  | "confirmation_pending"
  | "rejected"
  | "pending_admin_approval"
  | "approved"
  | "paid";

export type Profile = {
  id: string;
  full_name: string;
  role: UserRole;
  branch: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
};
