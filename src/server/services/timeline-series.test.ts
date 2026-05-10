import { describe, expect, it } from "vitest";
import {
  buildTimelineSeries,
  getTimelineSeries,
  type TimelineSeriesSourceRows,
} from "@/server/services/timeline-series";

const ids = {
  family: "20000000-0000-4000-8000-000000000001",
  user: "20000000-0000-4000-8000-000000000002",
  entry_pain: "20000000-0000-4000-8000-000000000003",
  entry_flare: "20000000-0000-4000-8000-000000000004",
  med_active: "20000000-0000-4000-8000-000000000005",
  med_stopped: "20000000-0000-4000-8000-000000000006",
  event_procedure: "20000000-0000-4000-8000-000000000007",
  event_injury: "20000000-0000-4000-8000-000000000008",
  appointment: "20000000-0000-4000-8000-000000000009",
  diagnosis: "20000000-0000-4000-8000-000000000010",
  decision: "20000000-0000-4000-8000-000000000011",
  profile: "20000000-0000-4000-8000-000000000012",
  role: "20000000-0000-4000-8000-000000000013",
};

const fixedNow = new Date("2026-05-10T12:00:00.000Z");

const filter = {
  date_from: "2018-01-01T00:00:00.000Z",
  date_to: "2027-01-01T00:00:00.000Z",
};

const happyRows: TimelineSeriesSourceRows = {
  entries: [
    {
      id: ids.entry_pain,
      type: "baseline",
      occurred_at: "2026-04-15T09:00:00.000Z",
      ended_at: null,
      title: "Morning baseline",
      pain_current: 4,
      pain_peak: 6,
      pain_average: 5,
      is_flare: false,
    },
    {
      id: ids.entry_flare,
      type: "flare",
      occurred_at: "2026-05-01T10:00:00.000Z",
      ended_at: "2026-05-01T13:00:00.000Z",
      title: "Mid-day flare",
      pain_current: 8,
      pain_peak: 9,
      pain_average: 8,
      is_flare: true,
    },
  ],
  events: [
    {
      id: ids.event_injury,
      type: "injury",
      occurred_at: "2018-08-01T00:00:00.000Z",
      ended_at: null,
      title: "Stab wound",
      summary: "Initial injury",
    },
    {
      id: ids.event_procedure,
      type: "procedure",
      occurred_at: "2026-03-01T15:00:00.000Z",
      ended_at: null,
      title: "Diagnostic block",
      summary: "L lateral thigh",
    },
  ],
  medications: [
    {
      id: ids.med_active,
      name: "Gabapentin",
      dose: "300mg",
      start_date: "2025-11-01",
      stop_date: null,
      status: "active",
      helped_pain: true,
      created_at: "2025-11-01T00:00:00.000Z",
    },
    {
      id: ids.med_stopped,
      name: "Amitriptyline",
      dose: "10mg",
      start_date: "2024-06-01",
      stop_date: "2024-12-15",
      status: "stopped",
      helped_pain: false,
      created_at: "2024-06-01T00:00:00.000Z",
    },
  ],
  appointments: [
    {
      id: ids.appointment,
      date_time: "2026-05-20T17:00:00.000Z",
      provider: "Dr. Lee",
      specialty: "Pain medicine",
      purpose: "Follow-up",
      after_visit_summary: null,
    },
  ],
  diagnoses: [
    {
      id: ids.diagnosis,
      title: "Neuropathic pain – L femoral cutaneous",
      summary: "Working diagnosis",
      status: "suspected",
      confidence: "moderate",
      last_reviewed_at: "2026-04-01T00:00:00.000Z",
      updated_at: "2026-04-01T00:00:00.000Z",
      created_at: "2025-01-01T00:00:00.000Z",
    },
  ],
  decisions: [
    {
      id: ids.decision,
      title: "Trial SCS?",
      status: "open",
      target_date: "2026-06-15",
      updated_at: "2026-04-20T00:00:00.000Z",
      created_at: "2026-03-01T00:00:00.000Z",
    },
  ],
};

describe("buildTimelineSeries", () => {
  it("returns an empty series with sensible defaults when there is no data", () => {
    const series = buildTimelineSeries({
      rows: {},
      filter: {},
      injuryAnchorIso: null,
      now: fixedNow,
    });

    expect(series.pain_points).toEqual([]);
    expect(series.flare_sessions).toEqual([]);
    expect(series.medications).toEqual([]);
    expect(series.procedures).toEqual([]);
    expect(series.consults).toEqual([]);
    expect(series.diagnostic_milestones).toEqual([]);
    expect(series.decisions).toEqual([]);
    expect(series.anchors.injury_date).toBeNull();
    expect(series.anchors.today).toBe(fixedNow.toISOString());
    expect(series.range.from).toBe(
      new Date(
        fixedNow.getTime() - 5 * 365 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    );
    expect(series.range.to).toBe(
      new Date(fixedNow.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    );
  });

  it("uses the injury anchor as the default date_from when present", () => {
    const series = buildTimelineSeries({
      rows: {},
      filter: {},
      injuryAnchorIso: "2018-08-01T00:00:00.000Z",
      now: fixedNow,
    });

    expect(series.range.from).toBe("2018-08-01T00:00:00.000Z");
    expect(series.anchors.injury_date).toBe("2018-08-01T00:00:00.000Z");
  });

  it("assembles every series shape from a happy-path row set", () => {
    const series = buildTimelineSeries({
      rows: happyRows,
      filter,
      injuryAnchorIso: "2018-08-01T00:00:00.000Z",
      now: fixedNow,
    });

    expect(series.pain_points).toHaveLength(2);
    expect(series.pain_points[0]).toMatchObject({
      entry_id: ids.entry_pain,
      pain_current: 4,
      pain_peak: 6,
      pain_average: 5,
      is_flare: false,
    });

    expect(series.flare_sessions).toHaveLength(1);
    expect(series.flare_sessions[0]).toMatchObject({
      id: ids.entry_flare,
      start_at: "2026-05-01T10:00:00.000Z",
      ended_at: "2026-05-01T13:00:00.000Z",
      peak_pain: 9,
      title: "Mid-day flare",
    });

    expect(series.medications).toHaveLength(2);
    const ongoing = series.medications.find((m) => m.id === ids.med_active);
    const stopped = series.medications.find((m) => m.id === ids.med_stopped);
    expect(ongoing).toMatchObject({
      name: "Gabapentin",
      start_at: "2025-11-01T00:00:00.000Z",
      end_at: null,
      status: "active",
      helped_pain: true,
    });
    expect(stopped).toMatchObject({
      name: "Amitriptyline",
      start_at: "2024-06-01T00:00:00.000Z",
      end_at: "2024-12-15T00:00:00.000Z",
      status: "stopped",
      helped_pain: false,
    });

    // Injury and procedure are both in events; the procedure list keeps
    // both since "injury" is a procedure-marker kind in the contract.
    expect(series.procedures.map((p) => p.kind).sort()).toEqual(
      ["injury", "procedure"].sort(),
    );

    expect(series.consults).toHaveLength(1);
    expect(series.consults[0]).toMatchObject({
      id: ids.appointment,
      provider: "Dr. Lee",
      specialty: "Pain medicine",
      purpose: "Follow-up",
    });

    expect(series.diagnostic_milestones).toHaveLength(1);
    expect(series.diagnostic_milestones[0]).toMatchObject({
      diagnosis_id: ids.diagnosis,
      diagnosis_name: "Neuropathic pain – L femoral cutaneous",
      status_to: "suspected",
    });

    expect(series.decisions).toHaveLength(1);
    expect(series.decisions[0]).toMatchObject({
      id: ids.decision,
      title: "Trial SCS?",
      target_date: "2026-06-15",
      decided_at: null,
      status: "open",
    });
  });
});

type SelectedTable =
  | "entries"
  | "events"
  | "medications"
  | "appointments"
  | "diagnoses"
  | "decisions"
  | "profiles";

type TableData = Record<SelectedTable, Record<string, unknown>[]>;

function buildMockClient(tableData: TableData) {
  const profile = {
    id: ids.profile,
    family_id: ids.family,
    email: "primary@example.com",
    roles: { slug: "primary" },
  };

  const auth = {
    getUser: async () => ({ data: { user: { id: ids.profile } }, error: null }),
  };

  function makeBuilder(table: SelectedTable) {
    const state = {
      filterEqColumn: null as string | null,
      filterEqValue: undefined as unknown,
      single: false,
      limit: Number.POSITIVE_INFINITY,
    };

    const exec = () => {
      let rows: Record<string, unknown>[] = [...(tableData[table] ?? [])];
      if (state.filterEqColumn !== null) {
        rows = rows.filter(
          (row) => row[state.filterEqColumn as string] === state.filterEqValue,
        );
      }
      rows = rows.slice(0, state.limit);
      if (state.single) {
        if (rows.length === 0) {
          return { data: null, error: new Error("not found") };
        }
        return { data: rows[0], error: null };
      }
      return { data: rows, error: null };
    };

    const builder: Record<string, unknown> = {
      select: () => builder,
      is: () => builder,
      eq: (column: string, value: unknown) => {
        // For our mock, "eq" only matters for profiles.id and events.type. We
        // record the most recently set eq so the resolver can apply it.
        state.filterEqColumn = column;
        state.filterEqValue = value;
        return builder;
      },
      gte: () => builder,
      lte: () => builder,
      order: () => builder,
      limit: (n: number) => {
        state.limit = n;
        return builder;
      },
      single: async () => {
        state.single = true;
        return exec();
      },
      then: (
        onResolved?: (value: unknown) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => Promise.resolve(exec()).then(onResolved, onRejected),
    };

    return builder;
  }

  return {
    auth,
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({ data: profile, error: null }),
            }),
          }),
        };
      }
      return makeBuilder(table as SelectedTable);
    },
    // unused; real client surface is wider, but the service only touches the
    // pieces above.
  } as unknown as Parameters<typeof getTimelineSeries>[1];
}

describe("getTimelineSeries integration (mocked supabase)", () => {
  it("returns an empty series shape when no rows are present", async () => {
    const client = buildMockClient({
      entries: [],
      events: [],
      medications: [],
      appointments: [],
      diagnoses: [],
      decisions: [],
      profiles: [],
    });

    const series = await getTimelineSeries({}, client);

    expect(series.pain_points).toEqual([]);
    expect(series.flare_sessions).toEqual([]);
    expect(series.medications).toEqual([]);
    expect(series.procedures).toEqual([]);
    expect(series.consults).toEqual([]);
    expect(series.diagnostic_milestones).toEqual([]);
    expect(series.decisions).toEqual([]);
    expect(series.anchors.injury_date).toBeNull();
    expect(series.anchors.today).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    );
  });

  it("assembles a populated series across multiple source tables", async () => {
    const client = buildMockClient({
      entries: happyRows.entries ?? [],
      events: happyRows.events ?? [],
      medications: happyRows.medications ?? [],
      appointments: happyRows.appointments ?? [],
      diagnoses: happyRows.diagnoses ?? [],
      decisions: happyRows.decisions ?? [],
      profiles: [],
    });

    const series = await getTimelineSeries(filter, client);

    expect(series.pain_points.length).toBeGreaterThan(0);
    expect(series.flare_sessions.length).toBe(1);
    expect(series.medications.length).toBe(2);
    expect(series.procedures.length).toBe(2);
    expect(series.consults.length).toBe(1);
    expect(series.diagnostic_milestones.length).toBe(1);
    expect(series.decisions.length).toBe(1);
    expect(series.anchors.injury_date).toBe("2018-08-01T00:00:00.000Z");
  });
});
