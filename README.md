# Traco Base | Sapatas 3D Sob Demanda

Repositorio de estrategia, catalogo parametrico e site comercial da Traco Base.

## Estrutura

- `docs/strategy/business.md`
  Estrategia do negocio, ICPs, pricing, operacao e go-to-market.
- `docs/catalog/parametric-catalog.md`
  Modelo de catalogo parametrico, regras de variantes e fluxo Rhino + Grasshopper.
- `docs/catalog/contracts.md`
  Contratos logicos para familias, variantes, pedidos proprios e solicitacoes especiais.
- `docs/site/blueprint.md`
  Arquitetura de informacao, UX, SEO e plano do funil proprio com Mercado Pago.
- `docs/site/seo-plan.md`
  Clusters de busca, paginas alvo e diretrizes editoriais.
- `docs/ops/database.sql`
  Schema Postgres/Supabase para pedidos, itens, pagamentos e revisoes tecnicas.
- `app/`
  Aplicacao Next.js com rotas SEO, configurador, carrinho e APIs de pedido/pagamento.
- `components/`
  Componentes compartilhados da interface.
- `lib/`
  Dados do catalogo, precificacao, validacao, persistencia e integracao Mercado Pago.
- `public/`
  Ativos publicos servidos pela aplicacao.
- `site/`
  Mockup estatico anterior, mantido apenas como referencia.

## Executar localmente

Instale as dependencias:

```bash
npm install
```

Depois rode em desenvolvimento:

```bash
npm run dev
```

Abra:

```text
http://127.0.0.1:3000
```

Para validar a build de producao:

```bash
npm run build
```

## Pedidos e pagamento

O v1 usa pedido proprio como fonte de verdade:

- `POST /api/orders` cria pedidos configurados ou briefings especiais.
- `POST /api/payments/mercado-pago/preference` cria a preferencia de pagamento para pedidos pagaveis.
- `POST /api/webhooks/mercado-pago` atualiza status de pagamento.
- `/admin/pedidos` lista pedidos, itens, medidas, pagamentos e revisoes tecnicas.

Com `DATABASE_URL`, os dados vao para Postgres/Supabase. Sem `DATABASE_URL`, o ambiente local usa `.local-data/orders.dev.json` apenas para desenvolvimento.

Copie `.env.example` para `.env.local` e preencha as chaves reais antes de testar pagamento.

## Premissas atuais

- Marca provisoria: `Traco Base`
- Mercado inicial: Brasil, em portugues
- Catalogo inicial: sapatas e ponteiras sob demanda
- Producao: 100% sob encomenda
- Material inicial principal: TPU, com validacao por familia antes de expansao
- Fonte geometrica: Rhino + Grasshopper
- Checkout v1: pedido proprio + Mercado Pago como processador de pagamento
