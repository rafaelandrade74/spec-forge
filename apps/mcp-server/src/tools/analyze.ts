import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { AnalysisService } from "@spec-forge/core";
import { safeJson } from "../format.js";

const findingSchema = z.object({
  area: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  description: z.string(),
  relatedTaskCodes: z.array(z.string()).optional(),
});

export function registerAnalyzeTools(server: McpServer) {
  server.tool(
    "analyze",
    "Run a consistency analysis across a feature's specification, plan and tasks, recording findings and their severity. A critical finding blocks mark_feature_ready. Equivalent to spec-kit's /analyze.",
    {
      featureId: z.string(),
      findings: z.array(findingSchema),
      status: z.enum(["draft", "in_review", "refined", "ready"]).optional(),
    },
    async (input) => safeJson(() => AnalysisService.analyze({ ...input, actorType: "ai" })),
  );
}
