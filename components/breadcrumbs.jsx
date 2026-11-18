import Link from "next/link";

import { StructuredData } from "@/components/structured-data";
import { buildBreadcrumbJsonLd } from "@/lib/breadcrumbs";

// Trilha visivel e BreadcrumbList JSON-LD a partir da mesma lista de itens.
export function Breadcrumbs({ items, className = "" }) {
  const lastIndex = items.length - 1;

  return (
    <>
      <StructuredData data={buildBreadcrumbJsonLd(items)} />
      <nav className={`breadcrumbs${className ? ` ${className}` : ""}`} aria-label="Trilha de navegação">
        <ol>
          {items.map((item, index) => (
            <li key={item.path}>
              {index === lastIndex ? (
                <span aria-current="page">{item.name}</span>
              ) : (
                <Link href={item.path}>{item.name}</Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
