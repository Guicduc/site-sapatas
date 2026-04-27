import { Suspense } from "react";

import { SpecialRequestBuilder } from "@/components/special-request-builder";
import { families } from "@/lib/site-data";

export const metadata = {
  title: "Projeto especial de sapatas",
  description:
    "Envie um briefing para desenvolver uma sapata fora da matriz padrão. Informe família de referência, medidas, aplicação, quantidade e acabamento desejado.",
  alternates: {
    canonical: "/projeto-especial"
  }
};

export default function ProjetoEspecialPage() {
  return (
    <>
      <section className="page-panel narrow-panel">
        <p className="eyebrow">Linha premium</p>
        <h1>Quando a matriz não resolve, o briefing já entra no ponto certo.</h1>
        <p className="lead">
          Use este fluxo para medidas fora do padrão, novas regras de fixação, demandas
          estéticas específicas ou famílias ainda não catalogadas.
        </p>
      </section>

      <Suspense fallback={<div className="surface-card">Carregando briefing…</div>}>
        <SpecialRequestBuilder families={families} />
      </Suspense>
    </>
  );
}
