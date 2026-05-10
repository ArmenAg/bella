# AI Agent Runtime Backend

The multi-turn agent is a family-scoped copilot for Bella Care Tracker. It can
read bounded records through allowlisted tools and create reviewable AI import
drafts. It cannot commit real medical records.

## Backend Contract

Server actions live in:

```text
src/server/actions/agent.ts
```

Contracts live in:

```text
src/server/contracts/agent.ts
```

Runtime services live in:

```text
src/server/services/agent.ts
src/server/services/agent-tools.ts
src/server/services/agent-runner.ts
```

Tables live in:

```text
public.ai_agent_threads
public.ai_agent_messages
public.ai_agent_tool_calls
public.ai_agent_context_snapshots
```

Agent-created drafts are stored in the existing import tables with
`agent_thread_id`:

```text
public.ai_import_sessions
public.ai_import_drafts
```

## Main Flow

1. `createAgentThread(input)`
   - Creates an audited thread for the current family.
   - Requires `primary` or `caregiver`.

2. `sendAgentMessage(input)`
   - Inserts the user message.
   - Captures a bounded case snapshot.
   - Runs the OpenAI Responses API loop.
   - Records each tool call before and after execution.
   - Inserts the assistant message.
   - Returns the thread, new messages, tool-call audit rows, and current drafts.

3. `listAgentThreads`, `listAgentMessages`, `listAgentToolCalls`
   - Read family-scoped runtime state for the UI.

## Tool Boundary

Read tools:

- `get_case_snapshot`
- `search_records`
- `search_timeline`
- `list_entries`, `get_entry`
- `list_sources`, `get_source`, `list_source_links`
- `list_procedure_events`, `get_procedure_event`
- `list_medications`, `get_medication`
- `list_medication_responses`, `get_medication_response`
- `list_decisions`, `get_decision`

Draft-only write tools:

- `create_draft`
- `update_draft`
- `reject_draft`

The model is not given `commitAiImportDraft` or any direct domain create/update
tool. Human approval remains the only path from draft to real record creation.

## OpenAI Runtime

The runner uses `openai.responses.parse` with OpenAI Responses function tools.
Tool input is described with JSON Schema for the model and validated again with
the local Zod contracts before execution. It is intentionally small and
explicit:

- Max tool turns: 6.
- Parallel tool calls: disabled.
- Tool output is capped before being returned to the model.
- The Responses client and tool executor are injectable for fake-client tests.

Required for real agent runs:

```text
OPENAI_API_KEY=...
AI_AGENT_MODEL=gpt-5.4-mini
```

If `AI_AGENT_MODEL` is not set, the backend falls back to `AI_IMPORT_MODEL`,
then `OPENAI_MODEL`, then `gpt-5.4-mini`.

## Audit And Export

The agent migration enables RLS and audit triggers for all agent runtime tables.
The following are included in `export_family_data()`:

- `ai_agent_threads`
- `ai_agent_messages`
- `ai_agent_tool_calls`
- `ai_agent_context_snapshots`
- `ai_import_sessions`
- `ai_import_drafts`

`soft_delete_record()` also allows the agent runtime tables and AI import
tables, preserving soft-delete behavior for family-owned records.

## Frontend Handoff

Build `/agent` as a multi-turn workspace:

- Thread list with create/archive controls.
- Chat transcript from `listAgentMessages`.
- Composer calling `sendAgentMessage`.
- Right rail for tool-call audit details and draft review cards.
- Draft cards should deep-link to the existing import review UI.
- Never show draft creation as a committed record.
- Keep the human commit button inside the import review flow only.

The UX should make the boundary visible: the agent can propose and organize; it
cannot finalize medical records.
