import Link from "next/link";

export function DemoBanner() {
  return (
    <aside className="demo-banner" role="status">
      <strong>Modo demonstração</strong>
      <span>Pedidos e pagamentos são simulações e não entram na operação real.</span>
      <Link href="/conta">Ver pedidos de teste</Link>
    </aside>
  );
}
