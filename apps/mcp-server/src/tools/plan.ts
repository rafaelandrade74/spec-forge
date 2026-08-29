import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { PlanService } from "@spec-forge/core";
import { safeJson } from "../format.js";

const statusEnum = z.enum(["draft", "in_review", "refined", "ready"]);

export function registerPlanTools(server: McpServer) {
  server.tool(
    "plan",
    "Create a new version of a feature's technical plan (architecture, decisions, contracts). Requires a specification that is at least in_review. Equivalent to spec-kit's /plan.",
    {
      featureId: z.string(),
      content: z.any().describe("Structured plan content: architecture, decisions, data model, API contracts."),
      status: statusEnum.optional(),
      note: z.string().optional(),
    },
    async (input) => safeJson(() => PlanService.plan({ ...input, actorType: "ai" })),
  );
}
