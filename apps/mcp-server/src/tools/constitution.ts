import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ConstitutionService } from "@spec-forge/core";
import { safeJson } from "../format.js";

const statusEnum = z.enum(["draft", "in_review", "refined", "ready"]);

export function registerConstitutionTools(server: McpServer) {
  server.tool(
    "set_constitution",
    "Create a new version of a project's constitution (guiding principles). Equivalent to spec-kit's /constitution.",
    {
      projectId: z.string(),
      content: z.string(),
      status: statusEnum.optional(),
    },
    async (input) => safeJson(() => ConstitutionService.setConstitution(input)),
  );

  server.tool(
    "get_constitution",
    "Get a project's constitution. Returns the active (ready) version unless a specific version is requested.",
    {
      projectId: z.string(),
      version: z.number().int().optional(),
    },
    async (input) => safeJson(() => ConstitutionService.getConstitution(input.projectId, input.version)),
  );
}
