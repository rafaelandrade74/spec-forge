import Link from "next/link";
import {
  SnapshotService,
  DocumentationService,
  listRevisionsForFeature,
} from "@spec-forge/core";
import {
  specifyAction,
  planAction,
  generateTasksAction,
  updateTaskStatusAction,
  analyzeAction,
  askClarificationAction,
  answerClarificationAction,
  markFeatureReadyAction,
} from "../../../../actions";
import { ErrorBanner } from "../../../../components/ErrorBanner";

const STATUS_OPTIONS = ["draft", "in_review", "refined", "ready"];
const TASK_STATUS_OPTIONS = ["pending", "ready", "in_progress", "done", "blocked", "skipped"];

export default async function FeatureDetailPage({
  params,
  searchParams,
}: {
  params: { projectId: string; featureId: string };
  searchParams: { error?: string };
}) {
  const [snapshot, documentation, revisions] = await Promise.all([
    SnapshotService.getFeatureSnapshot(params.featureId),
    DocumentationService.getDocumentation(params.featureId),
    listRevisionsForFeature(params.featureId),
  ]);

  const { project, feature, constitution, specification, plan, analysis, tasks, clarifications } = snapshot;
  const pendingClarifications = clarifications.filter((c) => c.status === "pending");
  const criticalFindings = ((analysis?.findings as { severity: string }[] | undefined) ?? []).filter(
    (f) => f.severity === "critical",
  );

  return (
    <>
      <div className="breadcrumb">
        <Link href="/">Projetos</Link> / <Link href={`/projects/${project.id}`}>{project.name}</Link> / {feature.title}
      </div>
      <ErrorBanner message={searchParams.error} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>{feature.title}</h2>
          <div className="pill-row">
            <span className={`badge status-${feature.status}`}>{feature.status}</span>
            <span className="badge">{feature.slug}</span>
            <span className="badge">prio {feature.priority}</span>
            {constitution && <span className="badge">constitution v{feature.constitutionVersionUsed}</span>}
          </div>
        </div>
        <form action={markFeatureReadyAction}>
          <input type="hidden" name="projectId" value={project.id} />
          <input type="hidden" name="featureId" value={feature.id} />
          <button type="submit" disabled={feature.status === "ready_for_implement" || feature.status === "done"}>
            Mark as Ready
          </button>
        </form>
      </div>

      {documentation && (
        <div className="card" style={{ marginBottom: 16 }}>
          <strong>Documentação final gerada</strong> — {documentation.filePath ?? "(sem arquivo, só no banco)"} em{" "}
          {documentation.generatedAt.toLocaleString()}
        </div>
      )}

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Specification {specification ? `(v${specification.version}, ${specification.status})` : ""}</h3>
        {specification ? (
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify(specification.content, null, 2)}</pre>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>Nenhuma specification ainda.</p>
        )}
        <details>
          <summary>Nova versão</summary>
          <form action={specifyAction}>
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="featureId" value={feature.id} />
            <div className="field">
              <label htmlFor="spec-content">Conteúdo (JSON)</label>
              <textarea
                id="spec-content"
                name="content"
                defaultValue={specification ? JSON.stringify(specification.content, null, 2) : "{\n  \"userStories\": []\n}"}
              />
            </div>
            <div className="field" style={{ maxWidth: 200 }}>
              <label htmlFor="spec-status">Status</label>
              <select id="spec-status" name="status" defaultValue={specification?.status ?? "refined"}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit">Salvar nova versão</button>
          </form>
        </details>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Clarifications</h3>
        {clarifications.length === 0 && <p style={{ color: "var(--text-muted)" }}>Nenhuma pergunta ainda.</p>}
        <ul className="task-list">
          {clarifications.map((c) => (
            <li key={c.id}>
              <strong>{c.question}</strong>{" "}
              <span className={`badge ${c.status === "pending" ? "status-blocked" : "status-done"}`}>{c.status}</span>
              {c.answer && <div className="meta">Resposta ({c.answeredBy}): {c.answer}</div>}
              {c.status === "pending" && (
                <form action={answerClarificationAction} className="inline" style={{ marginTop: 6 }}>
                  <input type="hidden" name="projectId" value={project.id} />
                  <input type="hidden" name="featureId" value={feature.id} />
                  <input type="hidden" name="clarificationId" value={c.id} />
                  <input name="answer" placeholder="Resposta" required style={{ flex: 1 }} />
                  <button type="submit" className="secondary">
                    Responder
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
        <details>
          <summary>Nova pergunta</summary>
          <form action={askClarificationAction} className="inline">
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="featureId" value={feature.id} />
            <input name="question" placeholder="Pergunta" required style={{ flex: 1 }} />
            <button type="submit">Adicionar</button>
          </form>
        </details>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Plan {plan ? `(v${plan.version}, ${plan.status})` : ""}</h3>
        {plan ? (
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12 }}>{JSON.stringify(plan.content, null, 2)}</pre>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>Nenhum plan ainda (requer specification em_review+).</p>
        )}
        <details>
          <summary>Nova versão</summary>
          <form action={planAction}>
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="featureId" value={feature.id} />
            <div className="field">
              <label htmlFor="plan-content">Conteúdo (JSON)</label>
              <textarea
                id="plan-content"
                name="content"
                defaultValue={plan ? JSON.stringify(plan.content, null, 2) : "{\n  \"architecture\": \"\"\n}"}
              />
            </div>
            <div className="field" style={{ maxWidth: 200 }}>
              <label htmlFor="plan-status">Status</label>
              <select id="plan-status" name="status" defaultValue={plan?.status ?? "refined"}>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit">Salvar nova versão</button>
          </form>
        </details>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Tasks</h3>
        {tasks.length === 0 && <p style={{ color: "var(--text-muted)" }}>Nenhuma task ainda (requer plan em_review+).</p>}
        <ul className="task-list">
          {tasks.map((t) => (
            <li key={t.id}>
              <strong>{t.code}</strong>
              {t.phase && <span className="badge">{t.phase}</span>}
              {t.story && <span className="badge">{t.story}</span>}
              {t.parallel && <span className="badge">P</span>} {t.title}{" "}
              <span className={`badge status-${t.status}`}>{t.status}</span>
              {t.description && <div className="meta">{t.description}</div>}
              <form action={updateTaskStatusAction} className="inline" style={{ marginTop: 6 }}>
                <input type="hidden" name="projectId" value={project.id} />
                <input type="hidden" name="featureId" value={feature.id} />
                <input type="hidden" name="taskId" value={t.id} />
                <select name="status" defaultValue={t.status} style={{ width: 150 }}>
                  {TASK_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button type="submit" className="secondary">
                  Atualizar
                </button>
              </form>
            </li>
          ))}
        </ul>
        <details>
          <summary>Gerar novas tasks</summary>
          <form action={generateTasksAction}>
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="featureId" value={feature.id} />
            <div className="field">
              <label htmlFor="tasks-json">Tasks (array JSON)</label>
              <textarea
                id="tasks-json"
                name="tasks"
                defaultValue={'[\n  { "code": "T001", "title": "...", "phase": "Setup", "story": "US1", "parallel": false }\n]'}
              />
            </div>
            <button type="submit">Gerar tasks</button>
          </form>
        </details>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>
          Analysis {analysis ? `(v${analysis.version}, ${analysis.status})` : ""}
          {criticalFindings.length > 0 && (
            <span className="badge severity-critical" style={{ marginLeft: 8 }}>
              {criticalFindings.length} crítico(s)
            </span>
          )}
        </h3>
        {analysis && Array.isArray(analysis.findings) && analysis.findings.length > 0 ? (
          <ul className="task-list">
            {(analysis.findings as { area: string; severity: string; description: string }[]).map((f, i) => (
              <li key={i}>
                <span className={`severity-${f.severity}`}>[{f.severity}]</span> <strong>{f.area}</strong>:{" "}
                {f.description}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "var(--text-muted)" }}>Nenhum finding ainda.</p>
        )}
        <details>
          <summary>Nova análise</summary>
          <form action={analyzeAction}>
            <input type="hidden" name="projectId" value={project.id} />
            <input type="hidden" name="featureId" value={feature.id} />
            <div className="field">
              <label htmlFor="findings-json">Findings (array JSON)</label>
              <textarea
                id="findings-json"
                name="findings"
                defaultValue={'[\n  { "area": "", "severity": "low", "description": "" }\n]'}
              />
            </div>
            <div className="field" style={{ maxWidth: 200 }}>
              <label htmlFor="analysis-status">Status</label>
              <select id="analysis-status" name="status" defaultValue="refined">
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit">Salvar análise</button>
          </form>
        </details>
      </section>

      <section className="card">
        <h3 style={{ marginTop: 0 }}>Histórico</h3>
        {revisions.length === 0 && <p style={{ color: "var(--text-muted)" }}>Sem revisões ainda.</p>}
        <ul className="task-list">
          {revisions.map((r) => (
            <li key={r.id}>
              <span className="meta">{r.createdAt.toLocaleString()}</span> — <strong>{r.entityType}</strong> por{" "}
              {r.actorType}
              {r.note && <div className="meta">{r.note}</div>}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
