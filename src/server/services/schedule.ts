import type { SupabaseClient } from "@supabase/supabase-js";
import {
  DEFAULT_PAGE_SIZE,
  appointmentFilterSchema,
  appointmentSchema,
  createAppointmentInputSchema,
  createTaskInputSchema,
  taskFilterSchema,
  taskSchema,
  updateAppointmentInputSchema,
  updateTaskInputSchema,
  type Appointment,
  type AppointmentFilter,
  type CreateAppointmentInput,
  type CreateTaskInput,
  type Task,
  type TaskFilter,
  type UpdateAppointmentInput,
  type UpdateTaskInput,
} from "@/server/contracts";
import { recordSoftDeleteReason } from "./audit";
import { assertCanWrite, requireCurrentProfile } from "./auth";
import { NotFoundError } from "./errors";

type AppointmentRow = Record<string, unknown>;
type TaskRow = Record<string, unknown>;

type PaginatedAppointments = {
  items: Appointment[];
  next_cursor: string | null;
  page_size: number;
};

type PaginatedTasks = {
  items: Task[];
  next_cursor: string | null;
  page_size: number;
};

const OPEN_TASK_STATUSES = ["open", "in_progress", "blocked"];

function normalizeAppointmentRow(row: AppointmentRow): Appointment {
  return appointmentSchema.parse({
    ...row,
    provider: row.provider ?? null,
    specialty: row.specialty ?? null,
    location: row.location ?? null,
    location_url: row.location_url ?? null,
    prep_notes: row.prep_notes ?? null,
    questions: Array.isArray(row.questions) ? row.questions : [],
    files_to_show: Array.isArray(row.files_to_show) ? row.files_to_show : [],
    decisions_needed: Array.isArray(row.decisions_needed)
      ? row.decisions_needed
      : [],
    after_visit_summary: row.after_visit_summary ?? null,
    follow_up_tasks: Array.isArray(row.follow_up_tasks)
      ? row.follow_up_tasks
      : [],
    deleted_at: row.deleted_at ?? null,
  });
}

function normalizeTaskRow(row: TaskRow): Task {
  return taskSchema.parse({
    ...row,
    due_at: row.due_at ?? null,
    notes: row.notes ?? null,
    appointment_id: row.appointment_id ?? null,
    decision_id: row.decision_id ?? null,
    diagnosis_id: row.diagnosis_id ?? null,
    source_id: row.source_id ?? null,
    deleted_at: row.deleted_at ?? null,
  });
}

export async function createAppointment(
  input: CreateAppointmentInput,
  supabase: SupabaseClient,
): Promise<Appointment> {
  const parsed = createAppointmentInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("appointments")
    .insert({
      ...parsed,
      family_id: profile.family_id,
      user_id: profile.id,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeAppointmentRow(data as AppointmentRow);
}

export async function updateAppointment(
  input: UpdateAppointmentInput,
  supabase: SupabaseClient,
): Promise<Appointment> {
  const parsed = updateAppointmentInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  const { id, ...patch } = parsed;

  const { data, error } = await supabase
    .from("appointments")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeAppointmentRow(data as AppointmentRow);
}

export async function softDeleteAppointment(
  id: string,
  reason: string,
  supabase: SupabaseClient,
): Promise<Appointment> {
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("appointments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await recordSoftDeleteReason("appointments", id, reason, supabase);

  return normalizeAppointmentRow(data as AppointmentRow);
}

export async function getAppointment(
  id: string,
  supabase: SupabaseClient,
): Promise<Appointment> {
  await requireCurrentProfile(supabase);

  const { data, error } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  if (!data) throw new NotFoundError("Appointment not found");
  return normalizeAppointmentRow(data as AppointmentRow);
}

export async function listAppointments(
  input: AppointmentFilter,
  supabase: SupabaseClient,
): Promise<PaginatedAppointments> {
  const parsed = appointmentFilterSchema.parse(input);
  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;

  let query = supabase
    .from("appointments")
    .select("*")
    .is("deleted_at", null)
    .order("date_time", { ascending: true })
    .order("id", { ascending: true })
    .limit(pageSize + 1);

  if (parsed.cursor) {
    query = query.gt("date_time", parsed.cursor);
  }

  if (parsed.upcoming) {
    query = query.gte("date_time", new Date().toISOString());
  }

  if (parsed.date_from) {
    query = query.gte("date_time", parsed.date_from);
  }

  if (parsed.date_to) {
    query = query.lte("date_time", parsed.date_to);
  }

  if (parsed.status) {
    query = query.eq("status", parsed.status);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = ((data ?? []) as AppointmentRow[]).map(normalizeAppointmentRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.date_time : null,
    page_size: pageSize,
  };
}

export async function createTask(
  input: CreateTaskInput,
  supabase: SupabaseClient,
): Promise<Task> {
  const parsed = createTaskInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      ...parsed,
      family_id: profile.family_id,
      user_id: profile.id,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeTaskRow(data as TaskRow);
}

export async function updateTask(
  input: UpdateTaskInput,
  supabase: SupabaseClient,
): Promise<Task> {
  const parsed = updateTaskInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  const { id, ...patch } = parsed;

  const { data, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeTaskRow(data as TaskRow);
}

export async function softDeleteTask(
  id: string,
  reason: string,
  supabase: SupabaseClient,
): Promise<Task> {
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("tasks")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await recordSoftDeleteReason("tasks", id, reason, supabase);

  return normalizeTaskRow(data as TaskRow);
}

export async function getTask(
  id: string,
  supabase: SupabaseClient,
): Promise<Task> {
  await requireCurrentProfile(supabase);

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  if (!data) throw new NotFoundError("Task not found");
  return normalizeTaskRow(data as TaskRow);
}

export async function listTasks(
  input: TaskFilter,
  supabase: SupabaseClient,
): Promise<PaginatedTasks> {
  const parsed = taskFilterSchema.parse(input);
  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;

  let query = supabase
    .from("tasks")
    .select("*")
    .is("deleted_at", null)
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(pageSize + 1);

  if (parsed.cursor) {
    query = query.lt("updated_at", parsed.cursor);
  }

  if (parsed.open_only) {
    query = query.in("status", OPEN_TASK_STATUSES);
  }

  if (parsed.status) {
    query = query.eq("status", parsed.status);
  }

  if (parsed.due_from) {
    query = query.gte("due_at", parsed.due_from);
  }

  if (parsed.due_to) {
    query = query.lte("due_at", parsed.due_to);
  }

  if (parsed.appointment_id) {
    query = query.eq("appointment_id", parsed.appointment_id);
  }

  if (parsed.decision_id) {
    query = query.eq("decision_id", parsed.decision_id);
  }

  if (parsed.diagnosis_id) {
    query = query.eq("diagnosis_id", parsed.diagnosis_id);
  }

  if (parsed.source_id) {
    query = query.eq("source_id", parsed.source_id);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const rows = ((data ?? []) as TaskRow[]).map(normalizeTaskRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.updated_at : null,
    page_size: pageSize,
  };
}
