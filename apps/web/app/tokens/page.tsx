import { TokenService } from "@spec-forge/core";
import { createTokenAction, revokeTokenAction } from "../actions";
import { ErrorBanner } from "../components/ErrorBanner";
import { TokenReveal } from "../components/TokenReveal";

export default async function TokensPage({
  searchParams,
}: {
  searchParams: { error?: string; newToken?: string; newLabel?: string };
}) {
  const tokens = await TokenService.listTokens();

  return (
    <>
      <div className="breadcrumb">Tokens de acesso ao MCP</div>
      <ErrorBanner message={searchParams.error} />

      {searchParams.newToken && (
        <TokenReveal token={searchParams.newToken} label={searchParams.newLabel ?? "default"} />
      )}

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr" }}>
        <section>
          <h2>Tokens existentes</h2>
          {tokens.length === 0 && <p style={{ color: "var(--text-muted)" }}>Nenhum token criado ainda.</p>}
          {tokens.map((t) => (
            <div className="card" key={t.id}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{t.label}</strong>{" "}
                  <span className={`badge ${t.revokedAt ? "status-blocked" : "status-done"}`}>
                    {t.revokedAt ? "revogado" : "ativo"}
                  </span>
                  <div className="meta">
                    criado {t.createdAt.toLocaleString()} · último uso{" "}
                    {t.lastUsedAt ? t.lastUsedAt.toLocaleString() : "nunca"}
                  </div>
                </div>
                {!t.revokedAt && (
                  <form action={revokeTokenAction}>
                    <input type="hidden" name="id" value={t.id} />
                    <button type="submit" className="secondary">
                      Revogar
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </section>

        <section>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Novo token</h3>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
              Use um nome que identifique de onde ele vai ser usado (ex.: nome da máquina), para
              poder revogar individualmente depois.
            </p>
            <form action={createTokenAction}>
              <div className="field">
                <label htmlFor="label">Nome / etiqueta</label>
                <input id="label" name="label" placeholder="ex: notebook-trabalho" required />
              </div>
              <button type="submit">Gerar token</button>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}
