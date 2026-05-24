# Traco Base

Aplicacao Next.js para catalogo configuravel e pedidos de sapatas sob medida para mobiliario.

## Visao rapida

- Framework: Next.js App Router, React e CSS global em `app/globals.css`.
- Produto principal: sapatas e ponteiras em TPU, configuraveis por medidas.
- Rotas publicas principais: `/`, `/catalogo`, `/configurar/[categoria]`, `/carrinho`, `/pedido-confirmado`, `/familias/[slug]`, `/como-funciona`, `/processo`, `/projeto-especial` e `/faq`.
- Fluxo comercial: usuario escolhe categoria/formato, configura medidas, adiciona ao carrinho, cria pedido e pode gerar pagamento via Mercado Pago.
- Dados de catalogo e regras de configuracao ficam em `lib/configurator-data.js`.
- Dados institucionais, SEO e familias ficam em `lib/site-data.js`.
- Scripts Grasshopper e fluxo 3MF ficam em `Produtos/`.

## Comandos

```bash
npm install
npm run dev
npm run build
npm run start
```

## Variaveis de ambiente

Use `.env.example` como base.

- `DATABASE_URL`: quando definido, pedidos usam Postgres. Sem ele, o app salva pedidos em `.local-data/orders.dev.json`.
- `DATABASE_SSL`: controla SSL da conexao Postgres.
- `NEXT_PUBLIC_SITE_URL`: URL publica usada em callbacks e links.
- `MERCADO_PAGO_ACCESS_TOKEN`: habilita criacao de preferencia de pagamento.
- `MERCADO_PAGO_WEBHOOK_SECRET`: valida assinatura do webhook do Mercado Pago quando configurado.
- `ADMIN_ACCESS_TOKEN`: protege areas administrativas.
- `ORCA_*`: configuracoes para integracao local com Orca Slicer.

## Documentacao para agentes

Leia [docs/ai-navigation.md](docs/ai-navigation.md) antes de alterar o projeto. Esse arquivo descreve a estrutura real da aplicacao, pontos de entrada e modulos que concentram regras de negocio.
