import Link from "next/link";
import { FeatureService, ProjectService } from "@spec-forge/core";
import { createFeatureAction, updateFeaturePriorityAction } from "../../actions";
import { ErrorBanner } from "../../components/ErrorBanner";

const COLUMNS: { key: string; label: string; statuses: string[] }[] = [
  { key: "backlog", label: "Backlog", statuses: ["backlog"] },
  {
    key: "refining",
    label: "Refining",
    statuses: ["specifying", "clarifying", "planning", "tasking", "analyzing", "refining"],
  },
  { key: "ready", label: "Ready", statuses: ["ready_for_implement"] },
  { key: "in_progress", label: "In Progress", statuses: ["in_progress"] },
  { key: "done", label: "Done", statuses: ["done"] },
  { key: "blocked", label: "Blocked", statuses: ["blocked"] },
];

export default async function ProjectRoadmapPage({
  params,
  searchParams,
}: {
  params: { projectId: string };
  searchParams: { error?: string };
}) {
  const [project, features] = await Promise.all([
    ProjectService.getProject(params.projectId),
    FeatureService.listFeatures(params.projectId),
  ]);

  return (
    <>
      <div className="breadcrumb">
        <Link href="/">Projetos</Link> / {project.name}
      </div>
      <ErrorBanner message={searchParams.error} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>{project.name}</h2>
        <div style={{ display: "flex", gap: 12 }}>
          <Link href={`/projects/${project.id}/constitution`}>Constitution</Link>
          <Link href={`/projects/${project.id}/queue`}>Fila de implementação</Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ marginTop: 0 }}>Nova demanda</h3>
        <form action={createFeatureAction} className="inline">
          <input type="hidden" name="projectId" value={project.id} />
          <div style={{ flex: 2 }}>
            <label htmlFor="title">Título</label>
            <input id="title" name="title" required />
          </div>
          <div style={{ width: 100 }}>
            <label htmlFor="priority">Prioridade</label>
            <input id="priority" name="priority" type="number" defaultValue={100} />
          </div>
          <button type="submit" style={{ marginTop: 18 }}>
            Criar
          </button>
        </form>
        <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 0 }}>
          Isso cria a feature no roadmap. Constitution → specify → clarify → plan → tasks → analyze são normalmente
          gerados via as tools MCP pelo Claude Code; aqui você acompanha e refina o resultado.
        </p>
      </div>

      <div className="board">
        {COLUMNS.map((col) => {
          const colFeatures = features
            .filter((f) => col.statuses.includes(f.status))
            .sort((a, b) => a.priority - b.priority);
          return (
            <div className="board-column" key={col.key}>
              <h3>
                {col.label} ({colFeatures.length})
              </h3>
              {colFeatures.map((f) => (
                <Link key={f.id} href={`/projects/${project.id}/features/${f.id}`} className="feature-card">
                  <div className="title">{f.title}</div>
                  <div className="meta">{f.slug}</div>
                  <div className="pill-row">
                    <span className={`badge status-${f.status}`}>{f.status}</span>
                    <span className="badge">prio {f.priority}</span>
                  </div>
                </Link>
              ))}
            </div>
          );
        })}
      </div>

      <details className="card" style={{ marginTop: 16 }}>
        <summary>Reordenar prioridade manualmente</summary>
        <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
          <tbody>
            {features
              .sort((a, b) => a.priority - b.priority)
              .map((f) => (
                <tr key={f.id}>
                  <td style={{ padding: "4px 8px" }}>{f.title}</td>
                  <td style={{ padding: "4px 8px", width: 220 }}>
                    <form action={updateFeaturePriorityAction} className="inline">
                      <input type="hidden" name="projectId" value={project.id} />
                      <input type="hidden" name="featureId" value={f.id} />
                      <input name="priority" type="number" defaultValue={f.priority} style={{ width: 80 }} />
                      <button type="submit" className="secondary">
                        Salvar
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </details>
    </>
  );
}
