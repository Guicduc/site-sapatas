// Layout neutro da area administrativa: so aplica noindex herdado por todas as paginas /admin.
export const metadata = {
  robots: {
    index: false,
    follow: true
  }
};

export default function AdminLayout({ children }) {
  return children;
}
