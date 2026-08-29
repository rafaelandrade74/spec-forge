import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { FeatureService, SnapshotService, ReadinessService } from "@spec-forge/core";
import { safeJson } from "../format.js";

export function registerFeatureTools(server: McpServer) {
  server.tool(
    "create_feature",
    "Start a new feature/demand in a project's roadmap. Returns the feature id used by all subsequent phase tools.",
    {
      projectId: z.string(),
      title: z.string(),
      priority: z.number().int().optional().describe("Lower number = higher priority. Default 100."),
      dependsOnFeatureIds: z.array(z.string()).optional(),
    },
    async (input) => safeJson(() => FeatureService.createFeature(input)),
  );

  server.tool(
    "list_features",
    "List all features of a project, ordered by priority.",
    { projectId: z.string() },
    async (input) => safeJson(() => FeatureService.listFeatures(input.projectId)),
  );

  server.tool(
    "get_feature_snapshot",
    "Get the full refined context of a feature: active constitution, current specification, plan, tasks, analysis and clarifications. Use this to resume work on a feature.",
    { featureId: z.string() },
    async (input) => safeJson(() => SnapshotService.getFeatureSnapshot(input.featureId)),
  );

  server.tool(
    "mark_feature_ready",
    "Mark a feature as ready for implementation. Validates that specification/plan/analysis are refined, tasks exist, there are no pending clarifications and no unresolved critical analysis findings.",
    { featureId: z.string() },
    async (input) => safeJson(() => ReadinessService.markFeatureReady(input.featureId)),
  );
}
