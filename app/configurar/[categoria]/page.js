import { notFound } from "next/navigation";

import { ProductConfigurator } from "@/components/product-configurator";
import { getCategoryBySlug, productCategories } from "@/lib/configurator-data";
import { buildPageMetadata } from "@/lib/page-metadata";

export function generateStaticParams() {
  return productCategories.map((category) => ({ categoria: category.slug }));
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const category = getCategoryBySlug(resolvedParams.categoria);

  if (!category) {
    return {};
  }

  return buildPageMetadata({
    title: `Configurar ${category.name}`,
    description: category.description,
    path: `/configurar/${category.slug}`
  });
}

export default async function ConfigurePage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const category = getCategoryBySlug(resolvedParams.categoria);

  if (!category) {
    notFound();
  }

  return <ProductConfigurator category={category} initialFormatSlug={resolvedSearchParams?.formato} />;
}
