import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero-panel page-panel narrow-panel">
      <p className="eyebrow">Página não encontrada</p>
      <h1>O caminho certo provavelmente começa pelo catálogo.</h1>
      <p className="lead">
        O endereço pode ter mudado ou não existe mais. Pelo catálogo você encontra todos os formatos disponíveis e configura as medidas do seu projeto.
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
