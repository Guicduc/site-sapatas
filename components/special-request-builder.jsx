"use client";

import { useState } from "react";

const projectsEmail = "projetos@baseforma.com.br";

export function SpecialRequestBuilder() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [phone, setPhone] = useState("");
  const [reference, setReference] = useState("");
  const [quantity, setQuantity] = useState("");
  const [deadline, setDeadline] = useState("");
  const [project, setProject] = useState("");

  const subject = "Projeto especial de sapata";
  const body = [
    "Olá, quero solicitar uma avaliação para uma peça especial.",
    "",
    `Nome: ${name || "Não informado"}`,
    `E-mail: ${email || "Não informado"}`,
    `Empresa: ${company || "Não informado"}`,
    `Telefone: ${phone || "Não informado"}`,
    `Produto ou família de referência: ${reference || "Não informado"}`,
    `Quantidade estimada: ${quantity || "Não informado"}`,
    `Prazo desejado: ${deadline || "Não informado"}`,
    "",
    "Necessidade da peça:",
    project || "Não informado"
  ].join("\n");
  const mailtoHref = `mailto:${projectsEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  const canSubmit = name.trim() && email.trim() && project.trim();

  function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit) return;

    window.location.href = mailtoHref;
  }

  return (
    <section className="special-request-workspace" aria-labelledby="special-request-form-title">
      <form className="brief-form" onSubmit={handleSubmit}>
        <div className="brief-form__heading">
          <p className="eyebrow">Formulário</p>
          <h2 id="special-request-form-title">Conte o que precisamos avaliar</h2>
          <p>
            Não precisa ter um desenho técnico pronto. Preencha os campos obrigatórios e, se
            possível, inclua medidas, aplicação, quantidade e prazo.
          </p>
        </div>

        <fieldset className="brief-form__section">
          <legend>
            <span>01</span>
            Seus dados
          </legend>

          <div className="field-row">
            <label className="field">
              <span>
                Nome <small className="required-label">obrigatório</small>
              </span>
              <input
                autoComplete="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>

            <label className="field">
              <span>
                E-mail <small className="required-label">obrigatório</small>
              </span>
              <input
                autoComplete="email"
                inputMode="email"
                required
                type="email"
                value={email}
                placeholder="nome@empresa.com.br"
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          </div>

          <div className="field-row">
            <label className="field">
              <span>
                Empresa <small className="optional-label">opcional</small>
              </span>
              <input
                autoComplete="organization"
                value={company}
                placeholder="Nome da empresa"
                onChange={(event) => setCompany(event.target.value)}
              />
            </label>

            <label className="field">
              <span>
                Telefone <small className="optional-label">opcional</small>
              </span>
              <input
                autoComplete="tel"
                inputMode="tel"
                value={phone}
                placeholder="(11) 00000-0000"
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="brief-form__section">
          <legend>
            <span>02</span>
            Contexto do projeto
          </legend>

          <label className="field">
            <span>
              Produto ou família de referência <small className="optional-label">opcional</small>
            </span>
            <input
              value={reference}
              placeholder="Ex.: sapata parecida com a linha Redonda, mas com outro encaixe"
              onChange={(event) => setReference(event.target.value)}
            />
          </label>

          <div className="field-row">
            <label className="field">
              <span>
                Quantidade estimada <small className="optional-label">opcional</small>
              </span>
              <input
                inputMode="numeric"
                value={quantity}
                placeholder="Ex.: 40 unidades"
                onChange={(event) => setQuantity(event.target.value)}
              />
            </label>

            <label className="field">
              <span>
                Prazo desejado <small className="optional-label">opcional</small>
              </span>
              <input
                value={deadline}
                placeholder="Ex.: primeira semana de agosto"
                onChange={(event) => setDeadline(event.target.value)}
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="brief-form__section">
          <legend>
            <span>03</span>
            Necessidade técnica
          </legend>

          <label className="field field-wide">
            <span>
              O que a peça precisa resolver? <small className="required-label">obrigatório</small>
            </span>
            <textarea
              aria-describedby="project-description-help"
              required
              placeholder="Ex.: preciso de uma sapata para um pé inclinado, com desenho oval, encaixe interno e acabamento discreto para uma cadeira autoral."
              value={project}
              onChange={(event) => setProject(event.target.value)}
            />
            <small className="field-help" id="project-description-help">
              Inclua medidas, local de uso, forma de fixação e qualquer restrição importante.
            </small>
          </label>
        </fieldset>

        <div className="brief-form__submit">
          <button className="button button-primary" type="submit" disabled={!canSubmit}>
            Preparar e-mail do projeto
          </button>
          <p>
            O botão abre seu aplicativo de e-mail com o briefing preenchido para envio a
            {` ${projectsEmail}`}.
          </p>
        </div>
      </form>
    </section>
  );
}
