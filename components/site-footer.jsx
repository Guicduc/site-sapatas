import Link from "next/link";

import { CookiePreferencesButton } from "@/components/cookie-preferences-button";
import { getInvoiceConfig } from "@/lib/invoice-config";
import { brand, company } from "@/lib/site-data";

export function SiteFooter() {
  const issuerCnpj = formatCnpj(getInvoiceConfig().issuerCnpj);
  const location = [company.city, company.state].filter(Boolean).join(" - ");

  return (
    <footer className="site-footer">
      <div>
        <strong>{brand.name}</strong>
        <p className="site-footer__legal">
          {company.legalName ? (
            <>
              {company.legalName}
              <br />
            </>
          ) : null}
          <strong>CNPJ:</strong> {issuerCnpj}
          {company.address ? (
            <>
              <br />
              {company.address}
            </>
          ) : null}
          {location ? (
            <>
              <br />
              {location}
            </>
          ) : null}
          <br />
          <a href={`mailto:${company.supportEmail}`}>{company.supportEmail}</a>
        </p>
        <p>Componentes técnicos sob medida para mobiliário.</p>
      </div>
      <div className="footer-links">
        <Link href="/catalogo">Catálogo</Link>
        <Link href="/carrinho">Carrinho</Link>
        <Link href="/conta">Minha conta</Link>
        <Link href="/projeto-especial">Projeto especial</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/termos">Condições de venda</Link>
        <Link href="/trocas">Trocas e devoluções</Link>
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
