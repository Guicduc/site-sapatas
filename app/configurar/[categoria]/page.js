import { notFound } from "next/navigation";

import { ProductConfigurator } from "@/components/product-configurator";
import { getCategoryBySlug, productCategories } from "@/lib/configurator-data";

export function generateStaticParams() {
  return productCategories.filter(hasActiveFormat).map((category) => ({ categoria: category.slug }));
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const category = getCategoryBySlug(resolvedParams.categoria);

  if (!category || !hasActiveFormat(category)) {
    return {};
  }

  return {
    title: `Configurar ${category.name}`,
    description: category.description
  };
}

export default async function ConfigurePage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const category = getCategoryBySlug(resolvedParams.categoria);

  if (!category || !hasActiveFormat(category)) {
    notFound();
  }

  return <ProductConfigurator category={category} initialFormatSlug={resolvedSearchParams?.formato} />;
}

function hasActiveFormat(category) {
  return category.formats.some((format) => format.status === "active");
}
