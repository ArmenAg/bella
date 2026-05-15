import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { AgentMessage } from "@/server/contracts";
import { AgentMessageBubble } from "./agent-message-bubble";

const timestamp = "2026-05-14T12:00:00.000Z";

function makeMessage(
  content: string,
  role: AgentMessage["role"] = "assistant",
): AgentMessage {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    family_id: "10000000-0000-4000-8000-000000000002",
    user_id:
      role === "assistant" ? null : "10000000-0000-4000-8000-000000000003",
    thread_id: "10000000-0000-4000-8000-000000000004",
    role,
    content,
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
  };
}

describe("AgentMessageBubble", () => {
  it("renders assistant markdown as semantic content", () => {
    const { container } = render(
      <AgentMessageBubble
        message={makeMessage(`Here are the last two flares:

1. **Unknown-date post-scar-injection response log**
   - **When:** captured as 2026-05-08
   - Pain peaked at **10/10**
2. **Pain log 3/22**
   - Sleep and dehydration were documented`)}
      />,
    );

    expect(container.querySelector("ol")).not.toBeNull();
    expect(container.querySelectorAll("li")).toHaveLength(5);
    expect(
      screen.getByText("Unknown-date post-scar-injection response log").tagName,
    ).toBe("STRONG");
    expect(container).not.toHaveTextContent("**Unknown-date");
  });

  it("keeps user-authored markdown literal", () => {
    const { container } = render(
      <AgentMessageBubble message={makeMessage("**Keep literal**", "user")} />,
    );

    expect(screen.getByText("**Keep literal**")).toBeInTheDocument();
    expect(container.querySelector("strong")).toBeNull();
  });

  it("preserves assistant soft line breaks", () => {
    const { container } = render(
      <AgentMessageBubble message={makeMessage("Line one\nLine two")} />,
    );

    expect(container.querySelector("br")).not.toBeNull();
    expect(container).toHaveTextContent("Line one");
    expect(container).toHaveTextContent("Line two");
  });

  it("does not render raw HTML or unsafe markdown links", () => {
    const { container } = render(
      <AgentMessageBubble
        message={makeMessage(
          `<script>alert("x")</script> **safe emphasis** [bad](javascript:alert(1)) [protocol](//example.com) [safe](https://example.com)`,
        )}
      />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container).toHaveTextContent('<script>alert("x")</script>');
    expect(screen.getByText("safe emphasis").tagName).toBe("STRONG");
    expect(screen.getByText("bad").closest("a")).toBeNull();
    expect(screen.getByText("protocol").closest("a")).toBeNull();
    expect(screen.getByRole("link", { name: "safe" })).toHaveAttribute(
      "target",
      "_blank",
    );
  });
});
