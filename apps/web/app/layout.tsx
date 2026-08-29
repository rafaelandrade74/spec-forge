import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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
