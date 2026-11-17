import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductConfigurator } from "@/components/product-configurator";
import { buildCatalogTrail } from "@/lib/breadcrumbs";
import { getCategoryBySlug, productCategories } from "@/lib/configurator-data";
import { buildPageMetadata, getConfiguratorOgImage } from "@/lib/page-metadata";

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
    title: category.seoTitle || `${category.publicName || category.name} sob medida`,
    description: category.description,
    path: `/configurar/${category.slug}`,
    image: getConfiguratorOgImage(category.slug)
  });
}

export default async function ConfigurePage({ params, searchParams }) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;
  const category = getCategoryBySlug(resolvedParams.categoria);

  if (!category) {
    notFound();
  }

  return (
    <>
      <Breadcrumbs items={buildCatalogTrail(category.publicName || category.name, `/configurar/${category.slug}`)} />
      <ProductConfigurator category={category} initialFormatSlug={resolvedSearchParams?.formato} />
    </>
  );
}
