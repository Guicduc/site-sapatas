# Blueprint do Site

## Objetivo do v1

Lancar uma vitrine comercial validavel com SEO forte, configurador parametrico e pedido proprio. O Mercado Pago entra apenas como processador de pagamento; o site continua sendo a fonte de verdade para funil, medidas, precificacao, status e dados tecnicos.

## Arquitetura de informacao

- `Home`
  configurador de compra e entrada por categoria.
- `Catalogo`
  visao geral das familias com filtros por aplicacao e fixacao.
- `Familias`
  paginas SEO proprias por familia.
- `Projeto especial`
  briefing estruturado para demandas fora da matriz.
- `Carrinho`
  revisao tecnica do pedido antes de gerar pagamento.
- `Pedido confirmado`
  status publico do pedido e do pagamento.
- `Admin pedidos`
  painel operacional para acompanhar pedidos, pagamentos e revisoes.
- `Como funciona`
  explicacao do fluxo comercial e produtivo.
- `Processo e material`
  pagina institucional tecnica sobre impressao 3D e TPU.
- `FAQ`
  respostas para objecoes comerciais e tecnicas.

## Direcao de UX

- linguagem B2B com sensibilidade estetica;
- navegacao orientada por aplicacao, nao so por codigo tecnico;
- configuracao dentro de range aprovado com preco e pagamento direto;
- configuracao fora de range direcionada para revisao tecnica sem cobranca automatica;
- projeto especial tratado como servico premium dentro do funil, nao como desvio.

## Elementos que precisam existir desde o v1

- cards de categoria com aplicacao, compatibilidade e faixa de configuracao;
- configurador por formato com ranges validados;
- resumo de preco, prazo, SKU, cor e acabamento;
- carrinho com snapshot das medidas;
- pedido persistido no backend;
- preferencia de pagamento Mercado Pago para pedido pagavel;
- webhook de pagamento;
- painel admin com status operacional.

## Estrutura de dados

O catalogo parametrico fica em codigo no v1. Cada pedido salva um snapshot com:

- cliente;
- itens;
- SKU gerado;
- medidas;
- cor e acabamento;
- quantidade;
- preco calculado;
- prazo estimado;
- status de pedido;
- status de pagamento;
- revisao tecnica, quando houver.

Essa estrutura deve continuar facil de migrar para outro backoffice no futuro, sem acoplar o v1 a uma plataforma de loja.

## Conversao

CTAs principais:

- configurar e pagar;
- falar no WhatsApp;
- enviar briefing especial;
- acompanhar pedido.

CTAs secundarios:

- ver familias relacionadas;
- entender processo e material;
- consultar compatibilidade.
