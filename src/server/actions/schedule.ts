"use server";

import {
  createAppointment as createAppointmentService,
  createTask as createTaskService,
  getAppointment as getAppointmentService,
  getTask as getTaskService,
  listAppointments as listAppointmentsService,
  listTasks as listTasksService,
  softDeleteAppointment as softDeleteAppointmentService,
  softDeleteTask as softDeleteTaskService,
  updateAppointment as updateAppointmentService,
  updateTask as updateTaskService,
} from "@/server/services/schedule";
import { createSupabaseServerClient } from "@/server/supabase/client";
import type {
  Appointment,
  AppointmentFilter,
  CreateAppointmentInput,
  CreateTaskInput,
  Task,
  TaskFilter,
  UpdateAppointmentInput,
  UpdateTaskInput,
} from "@/server/contracts";
import { toActionResult, type ActionResult } from "./result";

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<ActionResult<Appointment>> {
  return toActionResult(async () =>
    createAppointmentService(input, await createSupabaseServerClient()),
  );
}

export async function updateAppointment(
  input: UpdateAppointmentInput,
): Promise<ActionResult<Appointment>> {
  return toActionResult(async () =>
    updateAppointmentService(input, await createSupabaseServerClient()),
  );
}

export async function softDeleteAppointment(
  id: string,
  reason: string,
): Promise<ActionResult<Appointment>> {
  return toActionResult(async () =>
    softDeleteAppointmentService(
      id,
      reason,
      await createSupabaseServerClient(),
    ),
  );
}

export async function getAppointment(
  id: string,
): Promise<ActionResult<Appointment>> {
  return toActionResult(async () =>
    getAppointmentService(id, await createSupabaseServerClient()),
  );
}

export async function listAppointments(input: AppointmentFilter) {
  return toActionResult(async () =>
    listAppointmentsService(input, await createSupabaseServerClient()),
  );
}

export async function createTask(
  input: CreateTaskInput,
): Promise<ActionResult<Task>> {
  return toActionResult(async () =>
    createTaskService(input, await createSupabaseServerClient()),
  );
}

export async function updateTask(
  input: UpdateTaskInput,
): Promise<ActionResult<Task>> {
  return toActionResult(async () =>
    updateTaskService(input, await createSupabaseServerClient()),
  );
}

export async function softDeleteTask(
  id: string,
  reason: string,
): Promise<ActionResult<Task>> {
  return toActionResult(async () =>
    softDeleteTaskService(id, reason, await createSupabaseServerClient()),
  );
}

export async function getTask(id: string): Promise<ActionResult<Task>> {
  return toActionResult(async () =>
    getTaskService(id, await createSupabaseServerClient()),
  );
}

export async function listTasks(input: TaskFilter) {
  return toActionResult(async () =>
    listTasksService(input, await createSupabaseServerClient()),
  );
}
