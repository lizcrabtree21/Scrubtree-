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

export type RequestType = "add" | "edit";
export type RequestTargetType = "surgeon_pref" | "procedure";
export type RequestStatus = "pending" | "approved" | "rejected";

export type SurgeonPrefPayload = {
  surgeon_id: string;
  procedure_id: string;
  instrument_set: string;
  equipment: string[];
  sutures: string;
  table_orientation: string;
  table_angle: number;
  consoles: ConsolePosition[];
  notes: string;
  step_instruments: Record<string, string>;
};

export type ProcedurePayload = {
  name: string;
  category: string;
  definition: string;
  summary: string;
  steps: { title: string; description: string }[];
};

export type EditRequest = {
  id: string;
  type: RequestType;
  target_type: RequestTargetType;
  target_id: string | null;
  surgeon_id: string | null;
  payload: SurgeonPrefPayload | ProcedurePayload;
  submitted_by: string;
  status: RequestStatus;
  decided_by: string | null;
  read_by: string[];
  submitted_at: string;
  updated_at: string;
};
