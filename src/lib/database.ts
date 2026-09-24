export type UserRole = "nurse" | "surgeon" | "admin";
export type UserStatus = "pending" | "active" | "rejected";

export type Surgeon = {
  id: string;
  name: string;
  specialty: string;
  is_demo: boolean;
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

export type Procedure = {
  id: string;
  name: string;
  category: string;
  definition: string;
  summary: string;
  is_demo: boolean;
  created_at: string;
};

export type ProcedureStep = {
  id: string;
  procedure_id: string;
  step_order: number;
  title: string;
  description: string;
  is_demo: boolean;
  created_at: string;
};

export type CompassPosition = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW";

export type ConsolePosition = {
  label: string;
  position: CompassPosition;
};

export type SurgeonPref = {
  id: string;
  surgeon_id: string;
  procedure_id: string;
  instrument_set: string;
  equipment: string[];
  sutures: string;
  table_orientation: string;
  table_angle: number;
  consoles: ConsolePosition[];
  notes: string;
  is_demo: boolean;
  created_at: string;
};

export type SurgeonPrefStep = {
  surgeon_pref_id: string;
  step_id: string;
  instrument: string;
};
