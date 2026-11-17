# Boleto pelo Mercado Pago

A emissao continua no Checkout Pro, junto de cartao e Pix. O site cria o pedido
antes da preferencia e nao exclui o tipo `ticket`. O Mercado Pago determina as
opcoes disponiveis para a conta e para a compra. Nao ha outro provedor, nova
variavel de ambiente ou migration.

## Fluxo do cliente

1. No carrinho, seguir para pagamento e escolher boleto no Mercado Pago.
2. Emitir o boleto no Checkout Pro. O pedido permanece aguardando pagamento.
3. Apos o webhook ou a conciliacao na confirmacao do pedido, a Baseforma mostra
   `Abrir boleto no Mercado Pago` e o vencimento na confirmacao e na conta.
4. No boleto do Mercado Pago, copiar o codigo ou imprimir e pagar pelo banco.
5. Se ja pagou, aguardar a confirmacao sem gerar outro pedido ou pagar de novo.
   Somente o pagamento aprovado libera a producao e os efeitos pos-pagamento.

O link vem de `transaction_details.external_resource_url` na Payments API ja
integrada. O parser preserva somente os campos necessarios. A resposta ao cliente
exige pedido pagavel, pagamento pendente mais recente, tipo `ticket`, mesmo valor
do pedido e URL HTTPS nos dominios brasileiros/globais do Mercado Pago. O payload
bruto permanece no servidor. Pagamentos aprovados, cancelados ou substituidos
nao mostram um boleto antigo como acao de pagamento.

O vencimento vem de `date_of_expiration`, exibido no fuso de Sao Paulo. Sem data
valida, o cliente e orientado a consultar o documento. Apos o vencimento, o site
oculta o link para pagar o boleto antigo e orienta consultar o Mercado Pago pela
conta. Isso nao cancela a cobranca no provedor nem emite outra automaticamente.
O Checkout Pro continua responsavel pelas opcoes oferecidas ao retomar o pagamento.

## Homologacao da conta antes de anunciar disponibilidade

- Confirmar que boleto aparece no Checkout Pro da conta vendedora. A ausencia
  nao deve ser tratada adicionando outro provedor; conferir disponibilidade com
  o Mercado Pago.
- Emitir um boleto de teste permitido pelo ambiente e verificar pedido pendente
  no admin, confirmacao e conta do comprador, com o mesmo valor e vencimento.
- Confirmar webhook assinado ou usar `Atualizar status` na confirmacao para
  consultar o pagamento real. Verificar que o link abre o documento correto.
- Validar aprovacao e cancelamento/expiracao no ambiente de teste: o boleto deixa
  de ser apresentado como acao de pagamento; somente aprovacao libera producao.
- Nao pagar boleto real para validar apenas a interface. A disponibilidade e a
  liquidacao na conta produtiva precisam de homologacao operacional propria.

## Referencias oficiais

- [Meios de pagamento do Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/additional-settings/payment-methods)
- [Boleto na Payments API](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/integration-configuration/other-payment-methods)
