import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { SpecificationService } from "@spec-forge/core";
import { safeJson } from "../format.js";

const statusEnum = z.enum(["draft", "in_review", "refined", "ready"]);

export function registerSpecifyTools(server: McpServer) {
  server.tool(
    "specify",
    "Create a new version of a feature's specification (user stories, acceptance criteria, scope, edge cases). Equivalent to spec-kit's /specify.",
    {
      featureId: z.string(),
      content: z.any().describe("Structured specification content: user stories, acceptance criteria, scope/out-of-scope, edge cases."),
      status: statusEnum.optional(),
      note: z.string().optional(),
    },
    async (input) => safeJson(() => SpecificationService.specify({ ...input, actorType: "ai" })),
  );
}
