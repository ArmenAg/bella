import "server-only";
import { listAppointments } from "@/server/actions/schedule";
import { listDecisions } from "@/server/actions/decisions";
import { listDiagnoses } from "@/server/actions/diagnoses";
import { listSources } from "@/server/actions/sources";
import { formatDateTime } from "@/lib/format";
import type { LinkedOption } from "./task-form";

export interface TaskFormOptions {
  appointments: LinkedOption[];
  decisions: LinkedOption[];
  diagnoses: LinkedOption[];
  sources: LinkedOption[];
}

export async function loadTaskFormOptions(): Promise<TaskFormOptions> {
  const [appointments, decisions, diagnoses, sources] = await Promise.all([
    listAppointments({ upcoming: true, page_size: 200 }),
    listDecisions({ page_size: 200 }),
    listDiagnoses({ page_size: 200 }),
    listSources({ page_size: 200 }),
  ]);

  return {
    appointments: appointments.ok
      ? appointments.data.items.map((appointment) => ({
          id: appointment.id,
          label: `${formatDateTime(appointment.date_time)} — ${appointment.purpose}`,
        }))
      : [],
    decisions: decisions.ok
      ? decisions.data.items.map((decision) => ({
          id: decision.id,
          label: decision.title,
        }))
      : [],
    diagnoses: diagnoses.ok
      ? diagnoses.data.items.map((diagnosis) => ({
          id: diagnosis.id,
          label: diagnosis.title,
        }))
      : [],
    sources: sources.ok
      ? sources.data.items.map((source) => ({
          id: source.id,
          label: source.title,
        }))
      : [],
  };
}
