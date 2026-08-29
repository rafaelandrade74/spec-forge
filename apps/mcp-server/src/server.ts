import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerProjectTools } from "./tools/projects.js";
import { registerConstitutionTools } from "./tools/constitution.js";
import { registerFeatureTools } from "./tools/feature.js";
import { registerSpecifyTools } from "./tools/specify.js";
import { registerClarifyTools } from "./tools/clarify.js";
import { registerPlanTools } from "./tools/plan.js";
import { registerTaskTools } from "./tools/tasks.js";
import { registerAnalyzeTools } from "./tools/analyze.js";
import { registerQueueTools } from "./tools/queue.js";

export function createServer() {
  const server = new McpServer({
    name: "spec-forge",
    version: "0.1.0",
  });

  registerProjectTools(server);
  registerConstitutionTools(server);
  registerFeatureTools(server);
  registerSpecifyTools(server);
  registerClarifyTools(server);
  registerPlanTools(server);
  registerTaskTools(server);
  registerAnalyzeTools(server);
  registerQueueTools(server);

  return server;
}
