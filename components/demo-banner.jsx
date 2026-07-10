"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function DemoBanner() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/demo-session", { cache: "no-store" })
      .then((response) => response.json())
      .then((payload) => {
        if (!cancelled) setActive(payload.active === true);
      })
      .catch(() => {
        if (!cancelled) setActive(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!active) return null;

  return (
    <aside className="demo-banner" role="status">
      <strong>Modo demonstração</strong>
      <span>Pedidos e pagamentos são simulações e não entram na operação real.</span>
      <Link href="/conta">Ver pedidos de teste</Link>
    </aside>
  );
}
