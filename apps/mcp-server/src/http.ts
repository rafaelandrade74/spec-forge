import express from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { TokenService } from "@spec-forge/core";
import { createServer } from "./server.js";

const PORT = Number(process.env.MCP_HTTP_PORT ?? 8787);

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

async function requireBearerToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  const header = req.header("authorization") ?? "";
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !value) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Missing or malformed Authorization: Bearer <token> header." },
      id: null,
    });
    return;
  }

  const token = await TokenService.verifyToken(value);
  if (!token) {
    res.status(401).json({
      jsonrpc: "2.0",
      error: { code: -32001, message: "Invalid or revoked token." },
      id: null,
    });
    return;
  }

  next();
}

app.post("/mcp", requireBearerToken, async (req, res) => {
  const server = createServer();
  try {
    const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
    res.on("close", () => {
      transport.close();
      server.close();
    });
  } catch (err) {
    console.error("Error handling MCP request:", err);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

app.get("/mcp", requireBearerToken, (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed." },
    id: null,
  });
});

app.delete("/mcp", requireBearerToken, (_req, res) => {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed." },
    id: null,
  });
});

app.listen(PORT, () => {
  console.log(`Spec-Forge MCP server (Streamable HTTP) listening on port ${PORT}`);
});
