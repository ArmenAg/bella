import { z } from "zod";
import { paginationInputSchema, utcDateTimeSchema, uuidSchema } from "./common";

export const appointmentStatusSchema = z.enum([
  "scheduled",
  "completed",
  "cancelled",
]);
export const taskStatusSchema = z.enum([
  "open",
  "in_progress",
  "blocked",
  "done",
  "cancelled",
]);
export const taskPrioritySchema = z.enum(["low", "normal", "high", "urgent"]);

export const appointmentMutationSchema = z.object({
  date_time: utcDateTimeSchema,
  subject_user_id: uuidSchema.optional(),
  entered_by_user_id: uuidSchema.optional(),
  care_team_member_id: uuidSchema.optional(),
  provider: z.string().max(240).optional(),
  specialty: z.string().max(240).optional(),
  location: z.string().max(400).optional(),
  location_url: z.string().url().optional(),
  purpose: z.string().min(1).max(4000),
  prep_notes: z.string().max(12000).optional(),
  questions: z.array(z.string().min(1).max(400)).default([]),
  files_to_show: z.array(z.string().min(1).max(240)).default([]),
  decisions_needed: z.array(z.string().min(1).max(400)).default([]),
  after_visit_summary: z.string().max(12000).optional(),
  follow_up_tasks: z.array(z.string().min(1).max(400)).default([]),
  status: appointmentStatusSchema.default("scheduled"),
});

export const createAppointmentInputSchema = appointmentMutationSchema;
export const updateAppointmentInputSchema = appointmentMutationSchema
  .partial()
  .extend({
    id: uuidSchema,
  });

export const taskMutationSchema = z.object({
  title: z.string().min(1).max(240),
  status: taskStatusSchema.default("open"),
  priority: taskPrioritySchema.default("normal"),
  due_at: utcDateTimeSchema.optional(),
  notes: z.string().max(12000).optional(),
  appointment_id: uuidSchema.optional(),
  decision_id: uuidSchema.optional(),
  diagnosis_id: uuidSchema.optional(),
  source_id: uuidSchema.optional(),
});

export const createTaskInputSchema = taskMutationSchema;
export const updateTaskInputSchema = taskMutationSchema.partial().extend({
  id: uuidSchema,
});

export const appointmentFilterSchema = paginationInputSchema.extend({
  date_from: utcDateTimeSchema.optional(),
  date_to: utcDateTimeSchema.optional(),
  status: appointmentStatusSchema.optional(),
  upcoming: z.boolean().optional(),
});

export const taskFilterSchema = paginationInputSchema.extend({
  due_from: utcDateTimeSchema.optional(),
  due_to: utcDateTimeSchema.optional(),
  status: taskStatusSchema.optional(),
  open_only: z.boolean().optional(),
  appointment_id: uuidSchema.optional(),
  decision_id: uuidSchema.optional(),
  diagnosis_id: uuidSchema.optional(),
  source_id: uuidSchema.optional(),
});

export const appointmentSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  subject_user_id: uuidSchema.nullable().optional(),
  entered_by_user_id: uuidSchema.nullable().optional(),
  date_time: utcDateTimeSchema,
  care_team_member_id: uuidSchema.nullable().optional(),
  provider: z.string().nullable(),
  specialty: z.string().nullable(),
  location: z.string().nullable(),
  location_url: z.string().nullable(),
  purpose: z.string(),
  prep_notes: z.string().nullable(),
  questions: z.array(z.string()),
  files_to_show: z.array(z.string()),
  decisions_needed: z.array(z.string()),
  after_visit_summary: z.string().nullable(),
  follow_up_tasks: z.array(z.string()),
  status: appointmentStatusSchema,
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const taskSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  title: z.string(),
  status: taskStatusSchema,
  priority: taskPrioritySchema,
  due_at: utcDateTimeSchema.nullable(),
  notes: z.string().nullable(),
  appointment_id: uuidSchema.nullable(),
  decision_id: uuidSchema.nullable(),
  diagnosis_id: uuidSchema.nullable(),
  source_id: uuidSchema.nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export type Appointment = z.infer<typeof appointmentSchema>;
export type Task = z.infer<typeof taskSchema>;
export type CreateAppointmentInput = z.input<
  typeof createAppointmentInputSchema
>;
export type UpdateAppointmentInput = z.input<
  typeof updateAppointmentInputSchema
>;
export type AppointmentFilter = z.input<typeof appointmentFilterSchema>;
export type CreateTaskInput = z.input<typeof createTaskInputSchema>;
export type UpdateTaskInput = z.input<typeof updateTaskInputSchema>;
export type TaskFilter = z.input<typeof taskFilterSchema>;
