import Link from "next/link";
import { ConstitutionService, ProjectService } from "@spec-forge/core";
import { setConstitutionAction } from "../../../actions";
import { ErrorBanner } from "../../../components/ErrorBanner";

export default async function ConstitutionPage({
  params,
  searchParams,
}: {
  params: { projectId: string };
  searchParams: { error?: string };
}) {
  const [project, active] = await Promise.all([
    ProjectService.getProject(params.projectId),
    ConstitutionService.getConstitution(params.projectId),
  ]);

  return (
    <>
      <div className="breadcrumb">
        <Link href="/">Projetos</Link> / <Link href={`/projects/${project.id}`}>{project.name}</Link> / Constitution
      </div>
      <ErrorBanner message={searchParams.error} />

      <div className="grid" style={{ gridTemplateColumns: "1.2fr 1fr" }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>
            Versão atual {active ? `(v${active.version}, ${active.status})` : "(nenhuma ainda)"}
          </h3>
          {active ? (
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>{active.content}</pre>
          ) : (
            <p style={{ color: "var(--text-muted)" }}>
              Nenhuma constitution definida ainda. O Claude Code normalmente cria a primeira via a tool
              <code> set_constitution</code>, mas você pode criar/editar aqui também.
            </p>
          )}
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Nova versão</h3>
          <form action={setConstitutionAction}>
            <input type="hidden" name="projectId" value={project.id} />
            <div className="field">
              <label htmlFor="content">Conteúdo</label>
              <textarea id="content" name="content" defaultValue={active?.content ?? ""} required />
            </div>
            <div className="field">
              <label htmlFor="status">Status</label>
              <select id="status" name="status" defaultValue="ready">
                <option value="draft">draft</option>
                <option value="in_review">in_review</option>
                <option value="refined">refined</option>
                <option value="ready">ready</option>
              </select>
            </div>
            <button type="submit">Salvar nova versão</button>
          </form>
        </div>
      </div>
    </>
  );
}
