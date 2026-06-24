import Link from "next/link";
import { redirect } from "next/navigation";

import { loginAdmin } from "@/app/admin/actions";
import { getAdminSession } from "@/lib/admin-session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata = {
  title: "Admin",
  description: "Acesso administrativo Traco Base."
};

function normalizeNextPath(value) {
  const path = String(value || "/admin/pedidos").trim();
  if (!path.startsWith("/admin")) return "/admin/pedidos";
  if (path.startsWith("//")) return "/admin/pedidos";
  return path;
}

export default async function AdminLoginPage({ searchParams }) {
  const resolvedSearchParams = await searchParams;
  const nextPath = normalizeNextPath(resolvedSearchParams?.next);
  const error = resolvedSearchParams?.error;
  const session = await getAdminSession();

  if (session) {
    redirect(nextPath);
  }

  return (
    <section className="page-panel narrow-panel admin-login-panel">
      <p className="eyebrow">Admin</p>
      <h1>Acesso operacional.</h1>
      <p className="lead">
        Entre com o token administrativo para iniciar uma sessao segura neste navegador.
      </p>

      <form className="cad-form" action={loginAdmin}>
        <input type="hidden" name="next" value={nextPath} />
        <label className="field">
          <span>Token administrativo</span>
          <input
            autoComplete="current-password"
            name="token"
            placeholder="ADMIN_ACCESS_TOKEN"
            required
            type="password"
          />
        </label>
        {error === "invalid_token" && (
          <p className="form-error" role="alert">
            Token invalido. Confira o valor de ADMIN_ACCESS_TOKEN.
          </p>
        )}
        <button className="button button-primary" type="submit">
          Entrar
        </button>
      </form>

      <p className="admin-note">
        O token nao fica na URL apos o login. A sessao expira automaticamente.
      </p>
      <Link className="button button-secondary" href="/">
        Voltar ao site
      </Link>
    </section>
  );
}
