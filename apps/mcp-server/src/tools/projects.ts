import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ProjectService } from "@spec-forge/core";
import { safeJson } from "../format.js";

export function registerProjectTools(server: McpServer) {
  server.tool(
    "list_projects",
    "List all projects registered in the roadmap system.",
    {},
    async () => safeJson(() => ProjectService.listProjects()),
  );

  server.tool(
    "create_project",
    "Create a new project that will hold its own constitution and feature roadmap.",
    {
      slug: z.string().describe("Unique short identifier, e.g. 'my-app'"),
      name: z.string(),
      repoPath: z.string().optional().describe("Absolute local path to the project's repository, used to write generated documentation files."),
      repoUrl: z.string().optional(),
      description: z.string().optional(),
    },
    async (input) => safeJson(() => ProjectService.createProject(input)),
  );

  server.tool(
    "get_or_create_project_by_repo",
    "Resolve the Spec-Forge project for a given local repository path, creating it automatically if it doesn't exist yet. Use this at the start of any speckit-* workflow instead of asking the user to create a project manually.",
    {
      repoPath: z.string().describe("Absolute path to the repository root (e.g. the output of `git rev-parse --show-toplevel`)."),
      name: z.string().optional().describe("Project display name to use if a new project needs to be created. Defaults to the repo folder name."),
    },
    async (input) => safeJson(() => ProjectService.getOrCreateProjectByRepoPath(input)),
  );
}
