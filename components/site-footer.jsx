import Link from "next/link";

import { brand } from "@/lib/site-data";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div>
        <strong>{brand.name}</strong>
        <p>Sapatas plásticas sob demanda para mobiliário.</p>
      </div>
      <div className="footer-links">
        <Link href="/catalogo">Catálogo</Link>
        <Link href="/carrinho">Carrinho</Link>
        <Link href="/conta">Minha conta</Link>
        <Link href="/projeto-especial">Projeto especial</Link>
        <Link href="/faq">FAQ</Link>
      </div>
    </footer>
  );
}
