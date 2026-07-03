import { Suspense } from "react";

import { SpecialRequestBuilder } from "@/components/special-request-builder";

export const metadata = {
  title: "Projeto especial de sapatas",
  description:
    "Envie um briefing para desenvolver uma sapata fora da matriz padrão. Informe referência, medidas, aplicação, quantidade e prazo desejado.",
  alternates: {
    canonical: "/projeto-especial"
  }
};

export default function ProjetoEspecialPage() {
  return (
    <>
      <section className="page-panel narrow-panel special-request-hero">
        <p className="eyebrow">Projeto especial</p>
        <h1>Briefing técnico para sapatas fora da matriz pública.</h1>
        <p className="lead">
          Envie medidas, aplicação e contexto de uso para avaliarmos o desenvolvimento. O retorno
          acontece por e-mail com a próxima etapa e eventuais dúvidas técnicas.
        </p>
      </section>

      <Suspense fallback={<div className="surface-card">Carregando briefing...</div>}>
        <SpecialRequestBuilder />
      </Suspense>
    </>
  );
}
