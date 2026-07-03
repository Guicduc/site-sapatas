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
    "Olá, quero solicitar uma avaliação para projeto especial de sapata.",
    "",
    `Nome: ${name || "Não informado"}`,
    `E-mail: ${email || "Não informado"}`,
    `Empresa: ${company || "Não informado"}`,
    `Telefone: ${phone || "Não informado"}`,
    `Produto de referência: ${reference || "Não informado"}`,
    `Quantidade estimada: ${quantity || "Não informado"}`,
    `Prazo desejado: ${deadline || "Não informado"}`,
    "",
    "Descrição técnica:",
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
          <p className="eyebrow">Briefing</p>
          <h2>Dados para avaliação</h2>
          <p>
            Preencha o essencial para reduzir retornos: contato, referência de produto, medidas,
            quantidade e condição de uso.
          </p>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Nome</span>
            <input
              autoComplete="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          <label className="field">
            <span>E-mail</span>
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
            <span>Empresa</span>
            <input
              autoComplete="organization"
              value={company}
              placeholder="Opcional"
              onChange={(event) => setCompany(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Telefone</span>
            <input
              autoComplete="tel"
              inputMode="tel"
              value={phone}
              placeholder="Opcional"
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
        </div>

        <div className="field-row">
          <label className="field">
            <span>Produto de referência</span>
            <input
              value={reference}
              placeholder="Ex.: tubo redondo, tubo quadrado, sapata lisa"
              onChange={(event) => setReference(event.target.value)}
            />
          </label>

          <label className="field">
            <span>Quantidade estimada</span>
            <input
              inputMode="numeric"
              value={quantity}
              placeholder="Ex.: 12 unidades"
              onChange={(event) => setQuantity(event.target.value)}
            />
          </label>
        </div>

        <label className="field">
          <span>Prazo desejado</span>
          <input
            value={deadline}
            placeholder="Ex.: preciso validar protótipo em 15 dias"
            onChange={(event) => setDeadline(event.target.value)}
          />
        </label>

        <label className="field field-wide">
          <span>Descreva o projeto</span>
          <textarea
            required
            aria-describedby="project-help"
            placeholder="Ex.: tubo 24 mm interno, base 28 mm, altura 14 mm, uso em mesa de jantar com pé metálico. Informar carga, tipo de piso e restrições de montagem ajuda na avaliação."
            value={project}
            onChange={(event) => setProject(event.target.value)}
          />
          <small id="project-help" className="field-help">
            Inclua medidas internas e externas, aplicação, material do móvel, cor desejada e qualquer
            restrição de montagem.
          </small>
        </label>

        <button className="button button-primary button-block" type="submit" disabled={!canSubmit}>
          Enviar briefing por e-mail
        </button>
      </form>

      <aside className="surface-card brief-preview-card">
        <p className="eyebrow">Destino</p>
        <h2>{projectsEmail}</h2>
        <p>
          O formulário monta um e-mail com o briefing técnico preenchido. Depois do envio, a equipe
          avalia viabilidade, dados faltantes e próximo passo.
        </p>

        <div className="brief-email-card" aria-label="Resumo do e-mail">
          <span>Assunto</span>
          <strong>{subject}</strong>
        </div>

        <ul className="brief-checklist">
          <li>Medidas e encaixe</li>
          <li>Aplicação e tipo de piso</li>
          <li>Quantidade e prazo</li>
          <li>Referência visual ou família próxima</li>
        </ul>
      </aside>
    </div>
  );
}
