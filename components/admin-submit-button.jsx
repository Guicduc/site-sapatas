"use client";

import { useFormStatus } from "react-dom";

// Botao de envio dos formularios do admin: bloqueia clique duplo e mostra o
// estado de envio enquanto a Server Action roda.
export function AdminSubmitButton({ children, pendingLabel = "Salvando…", className = "button button-primary" }) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" disabled={pending} aria-disabled={pending || undefined}>
      {pending ? pendingLabel : children}
    </button>
  );
}
