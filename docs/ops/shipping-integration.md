# Integracao de frete

## Provedor implementado

O provedor real implementado e Melhor Envio.

- Endpoint usado para cotacao: `POST /api/v2/me/shipment/calculate`.
- O checkout chama a rota interna `POST /api/shipping/quote`.
- A criacao do pedido recalcula o frete no servidor antes de salvar, sem confiar no valor calculado pelo navegador.
- Se o provedor estiver sem token ou sem CEP de origem, o site usa fallback manual e registra essa origem no objeto `commerce.shipping`.
- Quando Melhor Envio esta ativo e configurado, a cotacao registra servico escolhido, alternativas retornadas, origem/destino e valor segurado. Dimensoes e peso existem somente no payload enviado ao provedor para calcular o frete.
- Mesmo com cotacao Melhor Envio ativa, a expedicao do lancamento permanece manual: o objeto de frete registra `fulfillmentMode: "manual_posting"` e nao compra etiqueta nem registra rastreio automaticamente.

## Lancamento com Correios manual

O lancamento do e-commerce usa `SHIPPING_PROVIDER=manual`. Nesse modo, o checkout mostra frete estimado por UF para postagem manual via Correios:

- SP: R$ 18, prazo operacional estimado de 5 dias.
- RJ, MG, ES e PR: R$ 28, prazo operacional estimado de 7 dias.
- SC e RS: R$ 28, prazo operacional estimado de 8 dias.
- Demais UFs: R$ 42, prazo operacional estimado de 10 dias.
- Pedidos acima de R$ 250 continuam com frete gratuito, mas a postagem tambem passa por conferencia humana.

O valor e o prazo sao estimativas comerciais para o MVP. A operacao deve revisar embalagem, endereco e servico dos Correios antes da postagem. A origem fica registrada em `metadata.commerce.shipping` com `provider: "manual"`, `source: "manual"`, `mode: "estimated_manual"`, `fulfillmentMode: "manual_posting"`, `serviceName: "Correios manual"` e `companyName: "Correios"`.

## Cotacao Melhor Envio sem etiqueta automatica

Faz sentido integrar Melhor Envio desde ja para homologar preco e prazo, mantendo a postagem manual no Correios. Para isso, configure `SHIPPING_PROVIDER=melhor_envio`, `MELHOR_ENVIO_ENV=sandbox`, `SHIPPING_ORIGIN_POSTAL_CODE`, `MELHOR_ENVIO_ACCESS_TOKEN` e `MELHOR_ENVIO_USER_AGENT`. Com credenciais validas, o checkout usa a cotacao retornada pelo Melhor Envio; sem credenciais ou em caso de erro, volta para a tabela manual.

Essa integracao e somente de cotacao. O pedido salvo deve continuar sendo tratado pela operacao em `/admin/pedidos`: conferir embalagem, emitir NF manual quando aplicavel, postar manualmente e preencher transportadora/rastreio se houver.

## Variaveis necessarias

- `SHIPPING_PROVIDER=melhor_envio`
- `SHIPPING_ORIGIN_POSTAL_CODE`: CEP de postagem/remetente.
- `MELHOR_ENVIO_ENV=sandbox` ou `production`.
- `MELHOR_ENVIO_ACCESS_TOKEN`: token de acesso da conta Melhor Envio.
- `MELHOR_ENVIO_USER_AGENT`: nome da aplicacao e e-mail tecnico.
- `MELHOR_ENVIO_SERVICE_IDS`: IDs de servico permitidos, separados por virgula, se quiser restringir a cotacao.
- `MELHOR_ENVIO_PREFERRED_SERVICE_IDS`: IDs preferidos para escolha automatica, separados por virgula.

## Parametros de embalagem

Como os produtos sao parametricos, o codigo transforma as medidas da peca em dados de envio:

- dimensoes enviadas em centimetros;
- peso enviado em quilogramas;
- peso por unidade vem de `priceBreakdown.materialGrams`;
- valor segurado vem do preco unitario recalculado no servidor;
- `SHIPPING_PACKAGING_WEIGHT_GRAMS` adiciona peso de embalagem por unidade;
- `SHIPPING_PRODUCT_PADDING_CM` adiciona folga dimensional;
- `SHIPPING_MIN_PRODUCT_DIMENSION_CM` e `SHIPPING_MIN_PRODUCT_WEIGHT_KG` impedem valores zerados ou pequenos demais.

Esses valores sao usados apenas durante a chamada de cotacao. O resumo comercial salvo no pedido nao inclui peso, pacotes ou dimensoes retornadas pelo provedor.

## Homologacao antes de producao

1. Criar ou confirmar a conta Melhor Envio.
2. Gerar token de sandbox.
3. Definir CEP de origem real.
4. Testar carrinhos com pecas pequenas, medias, grandes e multiplos itens.
5. Comparar preco e prazo exibidos no site com a cotacao do painel Melhor Envio.
6. Ajustar folga e peso de embalagem.
7. Definir servicos permitidos e preferidos.
8. So depois disso trocar `MELHOR_ENVIO_ENV=production`, ainda sem compra automatica de etiqueta.

## Proxima fase

- Inserir frete escolhido no carrinho do Melhor Envio.
- Comprar etiqueta.
- Gerar e imprimir etiqueta.
- Receber webhooks de rastreio.
- Exibir rastreio na conta do cliente e no admin operacional.
