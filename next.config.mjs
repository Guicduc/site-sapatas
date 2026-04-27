/** @type {import('next').NextConfig} */
const nextConfig = {
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
