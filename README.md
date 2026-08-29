# Spec-Forge

[github.com/rafaelandrade74/spec-forge](https://github.com/rafaelandrade74/spec-forge)

MCP server + roadmap de especificações estilo [spec-kit](https://github.com/github/spec-kit), com `constitution → specify → clarify → plan → tasks → analyze` persistidos em PostgreSQL. O `implement` fica fora do sistema: uma sessão de implementação (Claude Code ou outra IA) consome os itens já refinados via a tool MCP `get_next_task`. Ao concluir todas as tasks de uma feature, o sistema gera automaticamente a documentação final (banco + arquivo markdown no repo, com o ID único da feature).

Veja "Estrutura" mais abaixo para como o monorepo está organizado.

## Setup

```bash
git clone https://github.com/rafaelandrade74/spec-forge.git
cd spec-forge
pnpm install
docker compose up -d          # sobe Postgres local na porta 5433
pnpm db:generate               # gera migrations a partir do schema (packages/db)
pnpm db:migrate                # aplica migrations
```

Variável de ambiente `DATABASE_URL` (opcional, default aponta para o docker-compose local):

```
DATABASE_URL=postgres://spec_forge:spec_forge@localhost:5433/spec_forge
```

## Subir tudo de uma vez (Postgres + MCP + Web UI)

```bash
pnpm dev
```

Sobe o Postgres local (`docker compose up -d`), o servidor MCP em modo HTTP (`:8787`) e a Web UI
(`:3000`) juntos, com logs coloridos por serviço no mesmo terminal. Ctrl+C encerra os dois. Use
isso quando quiser registrar o MCP no Claude Code apontando para `http://localhost:8787/mcp` (gere
o token em `/tokens` na Web UI) em vez de rodar via stdio.

## Rodar o servidor MCP sozinho (stdio, para o Claude Code gerenciar o processo)

```bash
pnpm mcp:dev
```

Com `--scope user` (disponível em qualquer sessão do Claude Code, não só dentro deste repo) o
caminho precisa ser absoluto — rode a partir da raiz do seu checkout:

```bash
claude mcp add --scope user spec-forge -- npx tsx "$(pwd)/apps/mcp-server/src/index.ts"
```

No PowerShell: `claude mcp add --scope user spec-forge -- npx tsx "$PWD\apps\mcp-server\src\index.ts"`.

Se preferir essa config versionada só neste repo (`.mcp.json`, caminho relativo funciona), use
`--scope project` em vez de `--scope user`. Em qualquer um dos casos, dá pra apontar para o build
(`pnpm --filter @spec-forge/mcp-server build`) em vez de `tsx`, usando `node .../apps/mcp-server/dist/index.js`.

## Testar o ciclo ponta a ponta sem UI

```bash
pnpm mcp:e2e
```

Executa localmente todo o fluxo `create_project → set_constitution → create_feature → specify → clarify → plan → generate_tasks → analyze → mark_feature_ready → get_next_task → report_task_progress`, e confirma a geração da documentação final em `docs/features/<slug>.md` no repo apontado por `repoPath`.

## Rodar a Web UI

```bash
pnpm web:dev
```

Abre em `http://localhost:3000` (ou porta configurada). Telas: dashboard de projetos, roadmap por status
(board), constitution, detalhe da feature (specification/clarifications/plan/tasks/analysis/histórico +
"Mark as Ready"), e fila de implementação. A UI usa Server Actions que chamam `packages/core` diretamente —
mesmo estado que o servidor MCP lê/escreve.

## Deploy no homelab (servidor remoto + autenticação por token)

Além do modo stdio local, o servidor MCP tem um modo HTTP (Streamable HTTP) protegido por bearer
token, pensado para rodar 24/7 no homelab e ser acessado de qualquer máquina — não só do PC onde
o Postgres está.

### 1. Gerar um token

**Via Web UI (recomendado)**: abra `/tokens` na Web UI (`pnpm web:dev`, ou a URL do homelab depois
do deploy), dê um nome ao token (ex. o nome da máquina) e clique em "Gerar token". A página já
mostra o comando `claude mcp add` pronto — com a URL do servidor MCP e o token no header de
autenticação — para você copiar e colar direto no terminal onde roda o Claude Code. Ajuste o campo
"URL do servidor MCP" se estiver gerando o comando de uma máquina diferente de onde o servidor
está publicado.

**Via CLI** (alternativa, sem precisar da Web UI no ar):

```bash
cd apps/mcp-server
DATABASE_URL="postgres://spec_forge:spec_forge@localhost:5433/spec_forge" pnpm token:create "meu-laptop"
```

Em ambos os casos, o token em texto plano só é mostrado **uma única vez** (formato `sf_...`) — copie e guarde (ex.: no
gerenciador de senhas). O banco só guarda o hash SHA-256, nunca o valor original. Outros comandos:

```bash
pnpm token:list             # lista tokens (sem expor o valor), status e último uso
pnpm token:revoke <id>      # revoga um token (não deleta o histórico de uso)
```

### 2. Subir no homelab via Docker

```bash
cp .env.prod.example .env   # edite POSTGRES_PASSWORD com uma senha forte
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm mcp-server sh -c "cd /app/packages/db && pnpm migrate"
docker compose -f docker-compose.prod.yml run --rm mcp-server sh -c "cd /app/apps/mcp-server && pnpm token:create homelab"
```

Isso sobe três serviços: `postgres` (só na rede interna do compose), `mcp-server` (HTTP na porta
8787) e `web` (porta 3000). Coloque um reverse proxy com TLS na frente (Caddy/Traefik/nginx — o que
você já usa no seu `docker-services`) apontando para `mcp-server:8787/mcp` e `web:3000`; não exponha
essas portas diretamente à internet sem TLS.

### 3. Registrar no Claude Code (de qualquer máquina)

```bash
claude mcp add --scope user --transport http spec-forge https://seu-dominio.exemplo/mcp \
  --header "Authorization: Bearer sf_SEU_TOKEN_AQUI"
```

Repita esse comando em cada máquina de onde você for usar o Claude Code (casa, trabalho, notebook) —
todas apontam para o mesmo servidor/banco no homelab, então o roadmap fica sincronizado
independente de onde você está. Gere um token por máquina (`token:create "nome-da-maquina"`) para
poder revogar individualmente se perder um device.

**Importante**: quando o servidor roda remotamente, `repoPath` de um projeto (usado para escrever
o markdown final em `docs/features/`) só existe na máquina do desenvolvedor, não no homelab — a
escrita do arquivo falha silenciosamente nesse caso (best-effort) e a documentação final continua
disponível no banco/Web UI normalmente.

## Estrutura

```
packages/db/         schema Drizzle + migrations + client Postgres
packages/core/        serviços de negócio (usados por mcp-server e web)
apps/mcp-server/      servidor MCP — stdio (dev local) ou HTTP com bearer token (homelab)
apps/web/             Next.js — dashboard/roadmap/refinamento (Server Actions sobre packages/core)
integrations/claude-skills/   skills /speckit-* adaptados para persistir no Spec-Forge (ver integrations/claude-skills/README.md)
```

## Usando seus comandos /speckit-* já existentes

Se você já usa o [GitHub spec-kit](https://github.com/github/spec-kit) (`specify init`) em outros
projetos com os skills `/speckit-constitution`, `/speckit-specify`, `/speckit-clarify`,
`/speckit-plan`, `/speckit-tasks`, `/speckit-analyze`, dá para continuar usando exatamente os mesmos
comandos — só trocando onde eles gravam. Um comando `spec-forge init` instala a versão adaptada
(que persiste no Spec-Forge em vez de `specs/NNN-nome/*.md`), perguntando se você quer instalar
**neste repositório** (sobrescreve os skills locais, se já existirem) ou **globalmente**
(`~/.claude/skills` — vale para qualquer projeto que ainda não tenha skills locais com o mesmo nome;
projetos com skills locais continuam usando a versão local, que tem prioridade).

### Setup do comando (uma vez), estilo `uv tool install`

Equivalente a `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@vX.Y.Z`
— **testado de verdade** contra [github.com/rafaelandrade74/spec-forge](https://github.com/rafaelandrade74/spec-forge).

**Passo 1 — garanta que o bin global do pnpm está no PATH** (só na primeira vez; se
`pnpm add -g` já funcionar no seu terminal, pule para o Passo 2):

```powershell
pnpm setup
```

Isso edita o profile do seu shell pra adicionar o diretório global do pnpm ao PATH. **Feche e abra
um terminal novo** depois de rodar — o PATH só atualiza em sessões novas.

**Passo 2 — instale**:

```bash
pnpm add -g github:rafaelandrade74/spec-forge#path:apps/cli
```

`#path:apps/cli` é sintaxe do **pnpm** (não do npm) para instalar a partir de um subdiretório de um
repo git — é o que faz funcionar sem precisar clonar nada manualmente. `dist/` e `templates/` do
`apps/cli` são versionados no repo de propósito (ver `apps/cli/README.md`), então não precisa
rodar nenhum build no seu lado.

**Alternativa sem pnpm** (não precisa do Passo 1; npm não entende a sintaxe `#path:`, então é
clone + install local em vez de instalar direto do git):

```bash
git clone https://github.com/rafaelandrade74/spec-forge.git
npm install -g ./spec-forge/apps/cli
```

Isso também funciona direto de um checkout que você já tenha localmente (`npm install -g
./apps/cli`, rodando da raiz do repo).

Pra atualizar depois de uma nova versão: rode o mesmo comando de novo (reinstala por cima).

### Uso

```bash
cd /caminho/do/seu/projeto
spec-forge init                       # pergunta interativamente: repo ou global
spec-forge init --scope repo          # não pergunta, instala neste repositório
spec-forge init --scope global        # não pergunta, instala em ~/.claude/skills
spec-forge init --scope repo --target /outro/caminho/.claude/skills   # caminho customizado
```

## Próximos passos (ver plano completo)

- Drag-and-drop de prioridade e diffs visuais de histórico (Fase 5)
- Robustez multi-agente (expiração de claims, concorrência em `get_next_task`) (Fase 6)
- Exportação para markdown compatível com o spec-kit original, autenticação multi-usuário (futuro)
