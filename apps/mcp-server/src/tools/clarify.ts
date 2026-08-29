import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ClarificationService } from "@spec-forge/core";
import { safeJson } from "../format.js";

export function registerClarifyTools(server: McpServer) {
  server.tool(
    "clarify_ask",
    "Record open questions about a feature's specification that need to be answered before planning. Equivalent to spec-kit's /clarify.",
    {
      featureId: z.string(),
      questions: z.array(z.string()).min(1),
    },
    async (input) => safeJson(() => ClarificationService.askClarifications(input)),
  );

  server.tool(
    "clarify_answer",
    "Answer a pending clarification question.",
    {
      clarificationId: z.string(),
      answer: z.string(),
      answeredBy: z.enum(["ai", "human"]).default("ai"),
    },
    async (input) => safeJson(() => ClarificationService.answerClarification(input)),
  );

  server.tool(
    "list_pending_clarifications",
    "List unanswered clarification questions for a feature. An empty result means the feature can move on to /plan.",
    { featureId: z.string() },
    async (input) => safeJson(() => ClarificationService.listPendingClarifications(input.featureId)),
  );
}
