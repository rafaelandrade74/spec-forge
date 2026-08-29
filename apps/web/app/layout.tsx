import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

// Every page here reads live state from Postgres — there is no meaningfully "static" route in
// this app. Without this, Next tries to prerender pages at build time, which both queries a
// database that may not exist yet and breaks the Docker build entirely (the "postgres" hostname
// used in DATABASE_URL only resolves inside the compose network at runtime, not during `docker
// build`).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Spec-Forge",
  description: "Roadmap de especificações refinadas para implementação por IA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <header className="topbar">
          <h1>
            <Link href="/">Spec-Forge</Link>
          </h1>
          <nav>
            <Link href="/tokens">Tokens (MCP)</Link>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
