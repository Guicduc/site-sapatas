import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductConfigurator } from "@/components/product-configurator";
import { getCategoryBySlug, productCategories } from "@/lib/configurator-data";

export function generateStaticParams() {
  return productCategories.map((category) => ({ categoria: category.slug }));
}

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const category = getCategoryBySlug(resolvedParams.categoria);

  if (!category) {
    return {};
  }

  return {
    title: `Configurar ${category.name}`,
    description: category.description
  };
}

export default async function ConfigurePage({ params }) {
  const resolvedParams = await params;
  const category = getCategoryBySlug(resolvedParams.categoria);

  if (!category) {
    notFound();
  }

  return (
    <Suspense fallback={<div className="surface-card">Carregando configurador...</div>}>
      <ProductConfigurator category={category} />
    </Suspense>
  );
}
