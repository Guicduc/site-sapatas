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
      <section className="special-request-hero">
        <div className="special-request-hero__title">
          <p className="eyebrow">Projeto especial</p>
          <h1>Uma peça fora do catálogo começa com um briefing bem definido.</h1>
        </div>
        <div className="special-request-hero__intro">
          <p className="lead">
            Conte onde a peça será usada, quais medidas importam e o que as opções atuais ainda
            não resolvem. A Baseforma avalia o caso e retorna por e-mail com o caminho de
            desenvolvimento.
          </p>
          <p className="special-request-hero__note">
            Indicado para novas geometrias, encaixes específicos e aplicações com requisitos
            técnicos fora da matriz atual.
          </p>
        </div>
      </section>

      <Suspense fallback={<div className="special-request-loading">Carregando formulário...</div>}>
        <SpecialRequestBuilder />
      </Suspense>
    </>
  );
}
