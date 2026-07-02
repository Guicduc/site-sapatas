# Integracao de frete

## Provedor implementado

O provedor real implementado e Melhor Envio.

- Endpoint usado para cotacao: `POST /api/v2/me/shipment/calculate`.
- O checkout chama a rota interna `POST /api/shipping/quote`.
- A criacao do pedido recalcula o frete no servidor antes de salvar, sem confiar no valor calculado pelo navegador.
- Se o provedor estiver sem token ou sem CEP de origem, o site usa fallback manual e registra essa origem no objeto `commerce.shipping`.
- Quando Melhor Envio esta ativo e configurado, a cotacao registra servico escolhido, alternativas retornadas, origem/destino, quantidade de produtos, peso total, valor segurado e dimensoes maximas do envio.

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

## Homologacao antes de producao

1. Criar ou confirmar a conta Melhor Envio.
2. Gerar token de sandbox.
3. Definir CEP de origem real.
4. Testar carrinhos com pecas pequenas, medias, grandes e multiplos itens.
5. Comparar preco e prazo exibidos no site com a cotacao do painel Melhor Envio.
6. Ajustar folga e peso de embalagem.
7. Definir servicos permitidos e preferidos.
8. So depois disso trocar `MELHOR_ENVIO_ENV=production`.

## Proxima fase

- Inserir frete escolhido no carrinho do Melhor Envio.
- Comprar etiqueta.
- Gerar e imprimir etiqueta.
- Receber webhooks de rastreio.
- Exibir rastreio na conta do cliente e no admin operacional.
