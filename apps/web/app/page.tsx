import Link from "next/link";
import { ProjectService } from "@spec-forge/core";
import { createProjectAction } from "./actions";
import { ErrorBanner } from "./components/ErrorBanner";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const projects = await ProjectService.listProjects();

  return (
    <>
      <ErrorBanner message={searchParams.error} />

      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr" }}>
        <section>
          <h2>Projetos</h2>
          {projects.length === 0 && <p style={{ color: "var(--text-muted)" }}>Nenhum projeto ainda.</p>}
          {projects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="feature-card">
              <div className="title">{p.name}</div>
              <div className="meta">{p.slug}{p.description ? ` — ${p.description}` : ""}</div>
            </Link>
          ))}
        </section>

        <section>
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Novo projeto</h3>
            <form action={createProjectAction}>
              <div className="field">
                <label htmlFor="slug">Slug</label>
                <input id="slug" name="slug" placeholder="meu-app" required />
              </div>
              <div className="field">
                <label htmlFor="name">Nome</label>
                <input id="name" name="name" required />
              </div>
              <div className="field">
                <label htmlFor="repoPath">Caminho do repositório (opcional)</label>
                <input id="repoPath" name="repoPath" placeholder="C:\Users\...\meu-app" />
              </div>
              <div className="field">
                <label htmlFor="description">Descrição (opcional)</label>
                <textarea id="description" name="description" style={{ minHeight: 60 }} />
              </div>
              <button type="submit">Criar projeto</button>
            </form>
          </div>
        </section>
      </div>
    </>
  );
}
