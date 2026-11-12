"use client";

import { useEffect, useRef } from "react";

// Em telas estreitas as abas rolam na horizontal; mantem a aba atual visivel.
export function AdminStageTabs({ children, label, activeStage }) {
  const ref = useRef(null);

  useEffect(() => {
    const nav = ref.current;
    const active = nav?.querySelector('[aria-current="page"]');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    const target = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
    nav.scrollLeft = Math.max(0, target);
  }, [activeStage]);

  return (
    <nav className="aw-tabs" aria-label={label} ref={ref}>
      {children}
    </nav>
  );
}
