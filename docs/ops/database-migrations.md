# Migrations do banco

O aplicativo não cria nem altera tabelas durante requests. `lib/db.js` mantém o
pool compartilhado e as transações. Mudanças de schema vivem em
`docs/ops/migrations/` e são aplicadas somente pelo comando explícito:

```bash
npm run db:migrate
```

O runner ordena os arquivos pelo nome, usa advisory lock no Postgres, calcula
SHA-256 com finais de linha normalizados para LF e registra cada arquivo em `schema_migrations` na mesma transação do
SQL. Um arquivo já aplicado não pode ser editado. Crie outra migration.

## Banco novo

1. Aplique uma vez o snapshot `docs/ops/database.sql`.
2. Rode `npm run db:migrate` para registrar e aplicar os deltas idempotentes.
3. Rode o comando outra vez. O resultado deve ter `applied: []`.

O snapshot existe para bootstrap e leitura. Depois do bootstrap, use somente
migrations versionadas para alterar o banco.

## Banco de produção existente

1. Confirme um restore point/backup no Neon.
2. Use o checkout exato que será publicado e carregue `DATABASE_URL` e
   `DATABASE_SSL` no processo local ou no CI controlado.
3. Rode `npm ci`, `npm test`, `npm run build` e o scan obrigatório de checkout.
4. Rode `npm run db:migrate` contra o banco de produção.
5. Rode `npm run db:migrate` novamente e confirme `applied: []`.
6. Só então faça merge/push em `main`, que dispara o deploy no Vercel.
7. Verifique `/api/integrations/health` e a fila em `/api/admin/outbox`.

A ordem migration antes do deploy é obrigatória porque o código publicado já
espera `post_payment_outbox` e as tabelas de roteamento/handoff de producao.
Rollback do aplicativo não remove migrations
aditivas nem apaga eventos pendentes.

## Cupons de uso restrito

`20260821_promotion_redemptions.sql` deve ser aplicada antes do codigo que reserva
cupons no checkout. A tabela grava apenas um HMAC da identidade normalizada, o id
interno da promocao e o pedido; nao grava codigo privado, CPF/CNPJ ou e-mail.

## Migration transacional crítica

`20260821_critical_transaction_safety.sql` limpa preferências pendentes
duplicadas antes de criar o índice único. Ela também valida documentos antigos.
Se houver CPF/CNPJ histórico fora do formato de 11 ou 14 dígitos, corrija esses
dados antes de executar a migration.

## Fronteira do sistema de producao

`20260821_production_system_handoff.sql` cria snapshots imutaveis, estado de
acknowledgement, eventos idempotentes e o roteamento exclusivo entre
`print_jobs` e o sistema externo. A migration marca pedidos com jobs existentes
ou producao manual ja iniciada como `legacy_print_queue`. Aplique-a antes de publicar o codigo, mesmo com
`PRODUCTION_SYSTEM_MODE=disabled`, porque a sincronizacao da ponte consulta o
roteamento duravel.

## Bancos com recursos ainda nao usados

`20260820_runtime_store_baseline.sql` cria idempotentemente as tabelas antes
criadas sob demanda pelos stores de pedidos, conta, carrinho e print_jobs.
Ela roda antes dos deltas de 21/08, inclusive em bancos onde a fila nunca
foi acessada. Preserva tabelas e dados existentes.
