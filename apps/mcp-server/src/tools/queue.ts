import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { QueueService, ProgressService } from "@spec-forge/core";
import { safeJson } from "../format.js";

export function registerQueueTools(server: McpServer) {
  server.tool(
    "get_next_task",
    "Claim and return the next task to implement: the highest-priority ready feature (with satisfied dependencies) and its next unblocked task, bundled with the full refined context (constitution, specification, plan, tasks, analysis). Returns null if nothing is ready.",
    {
      projectId: z.string().optional(),
      agentIdentifier: z.string().describe("Identifier of the implementing agent/session, e.g. 'claude-code@hostname'."),
    },
    async (input) => safeJson(() => QueueService.getNextTask(input)),
  );

  server.tool(
    "report_task_progress",
    "Report progress on a task. When this completes the last pending task of a feature, the feature is marked done and its final documentation is generated automatically (persisted and written to the repo).",
    {
      taskId: z.string(),
      status: z.enum(["pending", "ready", "in_progress", "done", "blocked", "skipped"]),
      note: z.string().optional(),
    },
    async (input) => safeJson(() => ProgressService.reportTaskProgress({ ...input, actorType: "ai" })),
  );

  server.tool(
    "report_feature_blocked",
    "Signal that a feature is blocked and needs human intervention.",
    {
      featureId: z.string(),
      note: z.string(),
    },
    async (input) => safeJson(() => ProgressService.reportFeatureBlocked({ ...input, actorType: "ai" })),
  );
}
