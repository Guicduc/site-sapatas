import { Suspense } from "react";

import { SpecialRequestBuilder } from "@/components/special-request-builder";

export const metadata = {
  title: "Projeto especial de sapatas",
  description:
    "Descreva a necessidade de uma sapata ou peça que não está disponível no catálogo da Baseforma.",
  alternates: {
    canonical: "/projeto-especial"
  }
};

export default function ProjetoEspecialPage() {
  return (
    <>
      <section className="page-panel narrow-panel special-request-hero">
        <p className="eyebrow">Projeto especial</p>
        <h1>Descreva a sua necessidade de peça, que te ajudamos com o desenvolvimento.</h1>
        <p className="lead">
          Se a forma que você precisa não aparece no catálogo, conte o que a peça deve resolver.
          Recebemos por e-mail e retornamos com o caminho de desenvolvimento.
        </p>
      </section>

      <Suspense fallback={<div className="surface-card">Carregando formulário...</div>}>
        <SpecialRequestBuilder />
      </Suspense>
    </>
  );
}
