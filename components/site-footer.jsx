import Link from "next/link";

import { CookiePreferencesButton } from "@/components/cookie-preferences-button";
import { getInvoiceConfig } from "@/lib/invoice-config";
import { brand } from "@/lib/site-data";

export function SiteFooter() {
  const issuerCnpj = formatCnpj(getInvoiceConfig().issuerCnpj);

  return (
    <footer className="site-footer">
      <div>
        <strong>{brand.name}</strong>
        <p className="site-footer__legal">
          <strong>CNPJ:</strong> {issuerCnpj}
        </p>
        <p>Componentes técnicos sob medida para mobiliário.</p>
      </div>
      <div className="footer-links">
        <Link href="/catalogo">Catálogo</Link>
        <Link href="/carrinho">Carrinho</Link>
        <Link href="/conta">Minha conta</Link>
        <Link href="/projeto-especial">Projeto especial</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/privacidade">Privacidade e cookies</Link>
        <CookiePreferencesButton />
      </div>
    </footer>
  );
}

function formatCnpj(value) {
  const digits = String(value || "").replace(/\D/g, "");

  if (digits.length !== 14) return "Não informado";

  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
}
