"use client";

import { useState } from "react";

const DEFAULT_URL = process.env.NEXT_PUBLIC_MCP_HTTP_URL || "http://localhost:8787/mcp";

export function TokenReveal({ token, label }: { token: string; label: string }) {
  const [url, setUrl] = useState(DEFAULT_URL);
  const [copied, setCopied] = useState(false);

  const command = `claude mcp add --scope user --transport http spec-forge ${url} --header "Authorization: Bearer ${token}"`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked (permissions, insecure context); the textarea
      // below is a reliable fallback — click it and copy manually (Ctrl/Cmd+C).
    }
  }

  return (
    <div className="card" style={{ borderColor: "var(--accent)", marginBottom: 16 }}>
      <strong>Token criado ({label})</strong>
      <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
        Copie o comando abaixo agora — o token não será mostrado novamente. Cole direto no terminal
        onde você roda o Claude Code.
      </p>

      <div className="field">
        <label htmlFor="mcp-url">URL do servidor MCP</label>
        <input
          id="mcp-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:8787/mcp"
        />
      </div>

      <div className="field">
        <label>Comando para colar no Claude Code</label>
        <textarea readOnly value={command} style={{ minHeight: 70 }} onFocus={(e) => e.target.select()} />
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={copy}>
          {copied ? "Copiado!" : "Copiar comando"}
        </button>
        <a href="/tokens" style={{ alignSelf: "center" }}>
          Ocultar
        </a>
      </div>
    </div>
  );
}
