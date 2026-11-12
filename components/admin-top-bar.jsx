import Link from "next/link";

import { logoutAdmin } from "@/app/admin/actions";
import { adminHref } from "@/lib/admin-session";

const LINKS = [
  { id: "pedidos", href: "/admin/pedidos", label: "Pedidos" },
  { id: "relatorios", href: "/admin/relatorios", label: "Relatórios" }
];

// Barra propria da area administrativa. A navegacao da loja fica oculta nas
// paginas que usam .admin-ws (ver app/admin/admin.css).
export function AdminTopBar({ current = "pedidos" }) {
  return (
    <header className="aw-bar">
      <Link className="aw-bar__brand" href={adminHref("/admin/pedidos")}>
        <img src="/brand/baseforma-icon.svg" alt="" width="26" height="26" />
        <span>Baseforma</span>
        <em>Operação</em>
      </Link>
      <nav className="aw-bar__nav" aria-label="Seções do admin">
        {LINKS.map((link) => (
          <Link
            href={adminHref(link.href)}
            aria-current={current === link.id ? "page" : undefined}
            key={link.id}
          >
            {link.label}
          </Link>
        ))}
      </nav>
      <div className="aw-bar__tools">
        <Link href="/">Ver loja</Link>
        <form action={logoutAdmin}>
          <button type="submit">Sair</button>
        </form>
      </div>
    </header>
  );
}
