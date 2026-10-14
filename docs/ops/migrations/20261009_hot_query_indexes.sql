-- Indices para consultas quentes que antes faziam seq scan.
-- Somente create index if not exists: idempotente e sem alterar dados.
-- O runner executa cada migration dentro de uma transacao, por isso nao ha
-- create index concurrently aqui.

-- hydratePostgresOrders e getLockedPostgresOrder: itens por pedido, ordenados.
create index if not exists order_items_order_id_idx
  on order_items(order_id, created_at);

-- hydratePostgresOrders: revisoes tecnicas por pedido.
create index if not exists technical_reviews_order_id_idx
  on technical_reviews(order_id, created_at desc);

-- Webhook do Mercado Pago: fallback por preferencia quando o pagamento ainda
-- nao tem provider_payment_id.
create index if not exists payments_provider_preference_idx
  on payments(provider_preference_id)
  where provider_preference_id is not null;

-- Conta: listOrdersByEmail e linkVerifiedOrdersToAccount filtram lower(email).
create index if not exists customers_lower_email_idx
  on customers((lower(email)));

-- Checkout: elegibilidade de cupom busca pedidos aprovados por CPF/CNPJ.
create index if not exists customers_document_idx
  on customers(document)
  where document is not null;

-- Join customers -> orders nas consultas de conta e cupom.
create index if not exists orders_customer_id_idx
  on orders(customer_id);
