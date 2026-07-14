import { siteUrl } from "@/lib/site-data";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/api",
          "/conta",
          "/carrinho",
          "/pedido-confirmado",
          "/demonstracao"
        ]
      }
    ],
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
