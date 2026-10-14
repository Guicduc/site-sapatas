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
  // NEXT_DIST_DIR permite rodar um segundo `next dev` local (ex.: preview) sem conflitar com o lock do .next padrao.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  poweredByHeader: false,
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
