// CSP conservadora: nao restringe script-src/style-src (Next usa scripts inline).
// form-action 'self': todos os formularios sao Server Actions ou onSubmit em JS;
// o redirecionamento ao Mercado Pago usa window.location.assign, fora do alcance de form-action.
// HSTS fica a cargo da Vercel (aplicado por padrao nos dominios servidos por ela).
const contentSecurityPolicy = [
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Hosts extras para desenvolvimento via Tailscale, sem liberar outras origens.
  allowedDevOrigins: (process.env.NEXT_DEV_ALLOWED_ORIGINS || "").split(",").map((host) => host.trim()).filter(Boolean),
  // NEXT_DIST_DIR permite rodar um segundo `next dev` local (ex.: preview) sem conflitar com o lock do .next padrao.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
  // Fotos de produto sao PNGs de 1-2 MB gerados externamente; o next/image entrega AVIF/WebP
  // redimensionado sob demanda. Larguras e qualidade enxutas limitam as transformacoes cobradas
  // pela Vercel, e o cache local da Vercel usa o hash do conteudo: trocar o PNG invalida a versao.
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 828, 1080, 1280, 1600, 1920],
    imageSizes: [96, 192, 256, 384],
    // Unica qualidade permitida (todo <Image> sem `quality` cai nela). Em q75 o AVIF do Next
    // (quality * 50/80 no sharp) apaga o grao da pintura dos tubos; q90 preserva a textura.
    qualities: [90],
    minimumCacheTTL: 2678400, // 31 dias
    localPatterns: [
      { pathname: "/products/**", search: "" },
      { pathname: "/brand/**", search: "" }
    ]
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders
      }
    ];
  },
  async redirects() {
    return [
      {
        source: "/catalogo.html",
        destination: "/catalogo",
        permanent: true
      },
      {
        source: "/como-funciona.html",
        destination: "/como-funciona",
        permanent: true
      },
      {
        source: "/processo.html",
        destination: "/processo",
        permanent: true
      },
      {
        source: "/projeto-especial.html",
        destination: "/projeto-especial",
        permanent: true
      },
      {
        source: "/faq.html",
        destination: "/faq",
        permanent: true
      },
      {
        source: "/familias/:slug.html",
        destination: "/familias/:slug",
        permanent: true
      }
    ];
  }
};

export default nextConfig;
