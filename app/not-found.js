import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero-panel page-panel narrow-panel">
      <p className="eyebrow">Página não encontrada</p>
      <h1>O caminho certo provavelmente começa pelo catálogo.</h1>
      <p className="lead">
        A URL pode ter mudado durante a migração para a nova estrutura com renderização em Node.
      </p>
      <div className="action-row">
        <Link className="button button-primary" href="/catalogo">
          Abrir catálogo
        </Link>
        <Link className="button button-secondary" href="/">
          Voltar para a home
        </Link>
      </div>
    </section>
  );
}
