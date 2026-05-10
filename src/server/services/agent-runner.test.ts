import { describe, expect, it } from "vitest";
import {
  agentCaseSnapshotSchema,
  type AgentMessage,
  type AgentThread,
} from "@/server/contracts";
import {
  runAgentTurnWithResponsesApi,
  type AgentResponsesClient,
} from "./agent-runner";

const timestamp = "2026-05-10T12:00:00.000Z";

const thread: AgentThread = {
  id: "10000000-0000-4000-8000-000000000301",
  family_id: "10000000-0000-4000-8000-000000000302",
  user_id: "10000000-0000-4000-8000-000000000303",
  source_id: null,
  title: "Agent test",
  mode: "agent",
  status: "active",
  model: "gpt-test",
  system_prompt_version: "ai-agent-v1",
  last_message_at: timestamp,
  metadata: {},
  error_message: null,
  created_at: timestamp,
  updated_at: timestamp,
  deleted_at: null,
};

const messages: AgentMessage[] = [
  {
    id: "10000000-0000-4000-8000-000000000304",
    family_id: thread.family_id,
    user_id: thread.user_id,
    thread_id: thread.id,
    role: "user",
    content: "What changed after the procedure?",
    content_json: {},
    status: "complete",
    model: null,
    response_id: null,
    token_input: null,
    token_output: null,
    parent_message_id: null,
    created_at: timestamp,
    updated_at: timestamp,
    deleted_at: null,
  },
];

const caseSnapshot = agentCaseSnapshotSchema.parse({
  generated_at: timestamp,
  recent_timeline: [
    {
      id: "timeline-1",
      title: "Procedure flare",
      summary: "Pain increased after procedure.",
    },
  ],
  recent_entries: [],
  active_medications: [],
  open_decisions: [],
  upcoming_appointments: [],
  open_tasks: [],
  recent_sources: [],
});

describe("agent runner", () => {
  it("runs a Responses API tool loop with injectable client and tools", async () => {
    const requests: Record<string, unknown>[] = [];
    const client: AgentResponsesClient = {
      parse: async (params) => {
        requests.push(params);

        if (requests.length === 1) {
          return {
            id: "resp-1",
            output: [
              {
                type: "function_call",
                name: "get_case_snapshot",
                call_id: "call-1",
                parsed_arguments: {},
              },
            ],
            usage: { input_tokens: 10, output_tokens: 2 },
          };
        }

        return {
          id: "resp-2",
          output_text:
            "I checked the case snapshot. The procedure flare is documented.",
          usage: { input_tokens: 12, output_tokens: 9 },
        };
      },
    };
    const hookEvents: string[] = [];

    const result = await runAgentTurnWithResponsesApi({
      thread,
      messages,
      caseSnapshot,
      model: "gpt-test",
      client,
      executeTool: async (name) => {
        expect(name).toBe("get_case_snapshot");
        return caseSnapshot;
      },
      hooks: {
        onToolCallStart: async () => {
          hookEvents.push("start");
          return { id: "tool-row-1" };
        },
        onToolCallEnd: async () => {
          hookEvents.push("end");
        },
      },
    });

    expect(result).toMatchObject({
      content:
        "I checked the case snapshot. The procedure flare is documented.",
      response_id: "resp-2",
      token_input: 12,
      token_output: 9,
      tool_calls: [
        {
          name: "get_case_snapshot",
          call_id: "call-1",
          status: "succeeded",
        },
      ],
    });
    expect(requests[1].previous_response_id).toBe("resp-1");
    expect(hookEvents).toEqual(["start", "end"]);
  });

  it("fails closed when the model exceeds the tool-turn limit", async () => {
    const client: AgentResponsesClient = {
      parse: async () => ({
        id: "resp-loop",
        output: [
          {
            type: "function_call",
            name: "get_case_snapshot",
            call_id: "call-loop",
            parsed_arguments: {},
          },
        ],
      }),
    };

    await expect(
      runAgentTurnWithResponsesApi({
        thread,
        messages,
        caseSnapshot,
        model: "gpt-test",
        client,
        executeTool: async () => caseSnapshot,
        maxToolTurns: 1,
      }),
    ).rejects.toThrow("maximum tool-turn limit");
  });
});
