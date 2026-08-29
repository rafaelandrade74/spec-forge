"use client";

import { deleteProjectAction } from "../actions";

export function DeleteProjectButton({ projectId, projectName }: { projectId: string; projectName: string }) {
  return (
    <form
      action={deleteProjectAction}
      onSubmit={(e) => {
        const ok = window.confirm(
          `Excluir o projeto "${projectName}"? Isso apaga PERMANENTEMENTE a constitution, todas as features, specs, plans, tasks, analyses e o histórico. Não tem como desfazer.`,
        );
        if (!ok) e.preventDefault();
      }}
    >
      <input type="hidden" name="projectId" value={projectId} />
      <button type="submit" className="secondary" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>
        Excluir
      </button>
    </form>
  );
}
