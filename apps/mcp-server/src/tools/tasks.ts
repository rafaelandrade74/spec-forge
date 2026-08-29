import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { TaskService } from "@spec-forge/core";
import { safeJson } from "../format.js";

const taskInputSchema = z.object({
  code: z.string().describe("Short unique code within the feature, e.g. 'T001'."),
  title: z.string(),
  description: z.string().optional(),
  filePaths: z.array(z.string()).optional(),
  phase: z.string().optional().describe("e.g. 'Setup', 'Foundational', 'Polish', or a phase number/name."),
  story: z.string().optional().describe("User story label this task belongs to, e.g. 'US1'. Omit for setup/foundational/polish tasks."),
  parallel: z.boolean().optional().describe("True if this task can run in parallel with sibling tasks (different files, no shared dependencies)."),
  estimatedComplexity: z.enum(["S", "M", "L"]).optional(),
  dependsOn: z.array(z.string()).optional().describe("Codes of tasks that must complete before this one."),
});

export function registerTaskTools(server: McpServer) {
  server.tool(
    "generate_tasks",
    "Generate the granular task list for a feature, with optional dependencies between tasks. Requires a plan that is at least in_review. Equivalent to spec-kit's /tasks.",
    {
      featureId: z.string(),
      tasks: z.array(taskInputSchema).min(1),
    },
    async (input) => safeJson(() => TaskService.generateTasks({ ...input, actorType: "ai" })),
  );

  server.tool(
    "list_tasks",
    "List all tasks of a feature, ordered by their execution order.",
    { featureId: z.string() },
    async (input) => safeJson(() => TaskService.listTasks(input.featureId)),
  );
}
