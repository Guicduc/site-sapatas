import Link from "next/link";

import styles from "@/components/content-blocks.module.css";
import { guidePath, guides } from "@/lib/guides";
import { buildPageMetadata } from "@/lib/page-metadata";
import { pageSeo } from "@/lib/seo-copy";

export const metadata = buildPageMetadata(pageSeo.guias);

export default function GuidesIndexPage() {
  return (
    <div className="legal-page">
      <section className="page-panel legal-hero">
        <p className="eyebrow">Guias</p>
        <h1>Guias para medir e escolher ponteiras e sapatas</h1>
        <p className="lead">
          Como medir o tubo e o metalon, tabelas de medidas em polegada e milímetro e as
          diferenças entre os tipos de ponteira e sapata. Use os guias antes de configurar a
          peça para acertar o encaixe de primeira.
        </p>
      </section>

      <section className={styles.cardGrid} aria-label="Lista de guias">
        {guides.map((guide) => (
          <article key={guide.slug} className={`surface-card ${styles.card}`}>
            <h2>
              <Link href={guidePath(guide.slug)}>{guide.heading}</Link>
            </h2>
            <p>{guide.description}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
