"use client";

import { useState } from "react";

export function CopyJsonButton({ text, label = "Copiar JSON", copiedLabel = "Copiado" }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="button button-secondary" type="button" onClick={copy}>
      {copied ? copiedLabel : label}
    </button>
  );
}
