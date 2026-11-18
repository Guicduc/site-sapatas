import { Suspense } from "react";

import { SpecialRequestBuilder } from "@/components/special-request-builder";
import { buildPageMetadata } from "@/lib/page-metadata";
import { pageSeo } from "@/lib/seo-copy";

export const metadata = buildPageMetadata(pageSeo.projetoEspecial);

export default function ProjetoEspecialPage() {
  return (
    <>
      <section className="special-request-hero">
        <div className="special-request-hero__title">
          <p className="eyebrow">Projeto especial</p>
          <h1>Projeto especial: ponteiras e sapatas personalizadas</h1>
        </div>
        <div className="special-request-hero__intro">
          <p className="lead">
            Precisa de uma ponteira fora do catálogo, de uma peça de reposição que saiu de linha ou
            de um lote para a sua fábrica? Conte onde a peça será usada, quais medidas importam e o
            que as opções atuais não resolvem. A Baseforma avalia o caso e responde por e-mail.
          </p>
          <p className="special-request-hero__note">
            Indicado para novas geometrias, encaixes específicos, medidas fora da faixa do
            configurador e lotes para marcenarias, serralherias e fábricas de móveis.
          </p>
        </div>
      </section>

      <Suspense fallback={<div className="special-request-loading">Carregando formulário...</div>}>
        <SpecialRequestBuilder />
      </Suspense>
    </>
  );
}
