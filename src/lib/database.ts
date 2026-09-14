export type UserRole = "nurse" | "surgeon" | "admin";
export type UserStatus = "pending" | "active" | "rejected";

export type Surgeon = {
  id: string;
  name: string;
  created_at: string;
};

export type UserProfile = {
  id: string;
  name: string;
  role: UserRole;
  surgeon_id: string | null;
  status: UserStatus;
  created_at: string;
};
