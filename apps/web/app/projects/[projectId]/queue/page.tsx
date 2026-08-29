import Link from "next/link";
import { ProjectService, QueueService } from "@spec-forge/core";

export default async function QueuePage({ params }: { params: { projectId: string } }) {
  const [project, overview] = await Promise.all([
    ProjectService.getProject(params.projectId),
    QueueService.getQueueOverview(params.projectId),
  ]);

  return (
    <>
      <div className="breadcrumb">
        <Link href="/">Projetos</Link> / <Link href={`/projects/${project.id}`}>{project.name}</Link> / Fila de
        implementação
      </div>
      <h2>Fila de implementação</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Features prontas ou em implementação, e as sessões que já chamaram <code>get_next_task</code>.
      </p>

      {overview.length === 0 && <p style={{ color: "var(--text-muted)" }}>Nada na fila no momento.</p>}

      {overview.map(({ feature, sessions }) => (
        <div className="card" key={feature.id}>
          <Link href={`/projects/${project.id}/features/${feature.id}`} className="title">
            {feature.title}
          </Link>{" "}
          <span className={`badge status-${feature.status}`}>{feature.status}</span>
          <div className="meta" style={{ marginTop: 8 }}>
            {sessions.length === 0 && "Nenhuma sessão ainda."}
            {sessions.map((s) => (
              <div key={s.id}>
                {s.agentIdentifier} — claimed em {s.claimedAt.toLocaleString()} — {s.status}
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
