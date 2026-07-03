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
    <div className="brief-grid special-request-layout">
      <form className="surface-card brief-form" onSubmit={handleSubmit}>
        <div className="brief-form__heading">
          <p className="eyebrow">Formulário</p>
          <h2>Descreva a sua necessidade de peça, que te ajudamos com o desenvolvimento</h2>
          <p>
            Use este canal para peças que não existem no catálogo: outro formato, outro encaixe,
            uma geometria específica ou uma solução feita para o seu móvel.
          </p>
        </div>

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

        <label className="field">
          <span>Produto ou família de referência</span>
          <input
            value={reference}
            placeholder="Ex.: vi uma sapata parecida no catálogo, mas preciso de outro formato"
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
              placeholder="Ex.: ate a primeira semana de agosto"
              onChange={(event) => setDeadline(event.target.value)}
            />
          </label>
        </div>

        <label className="field field-wide">
          <span>
            Necessidade da peça <small className="required-label">obrigatório</small>
          </span>
          <textarea
            required
            placeholder="Descreva a forma que você precisa, onde a peça será usada e o que falta nas opções do site. Ex.: preciso de uma sapata para um pé inclinado, com desenho oval, encaixe interno e acabamento discreto para uma cadeira autoral."
            value={project}
            onChange={(event) => setProject(event.target.value)}
          />
        </label>

        <button className="button button-primary button-block" type="submit" disabled={!canSubmit}>
          Enviar para {projectsEmail}
        </button>
      </form>
    </div>
  );
}
