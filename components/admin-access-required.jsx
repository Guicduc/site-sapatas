import Link from "next/link";

export function AdminAccessRequired({ nextPath = "/admin/pedidos", scope = "a area administrativa" }) {
  return (
    <section className="page-panel narrow-panel">
      <p className="eyebrow">Admin</p>
      <h1>Acesso restrito.</h1>
      <p className="lead">
        Entre com o token administrativo para acessar {scope}.
      </p>
      <Link className="button button-primary" href={`/admin?next=${encodeURIComponent(nextPath)}`}>
        Entrar no admin
      </Link>
    </section>
  );
}
