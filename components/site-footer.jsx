import Link from "next/link";

import { brand } from "@/lib/site-data";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>{brand.name}</strong>
        <p>{brand.tagline}. Configuração por categoria, formato e medida funcional.</p>
      </div>
      <div className="footer-links">
        <Link href="/">Configurar</Link>
        <Link href="/catalogo">Catálogo</Link>
        <Link href="/carrinho">Carrinho</Link>
        <Link href="/projeto-especial">Projeto especial</Link>
        <Link href="/faq">FAQ</Link>
      </div>
    </footer>
  );
}
