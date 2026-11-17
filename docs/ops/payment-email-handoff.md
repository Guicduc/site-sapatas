# Handoff de pagamento e e-mail

Atualizado em 16/11/2026. O historico abaixo descreve a ativacao inicial em 29/06/2026; a configuracao atual de remetente esta na secao E-mail.

## Estado ja publicado

- Commit de integracao publicado em `main`: `08ba35c` (`Integra APIs operacionais do ecommerce`).
- Deploy Vercel de producao ficou `Ready`.
- Neon Postgres foi criado no Vercel, conectado ao projeto e recebeu o schema de `docs/ops/database.sql`.
- Variaveis de producao/preview no Vercel foram configuradas para:
  - `DATABASE_URL` e variaveis Neon relacionadas.
  - `NEXT_PUBLIC_SITE_URL=https://baseforma.com.br`.
  - Segredos de sessao/admin.
  - Resend e remetentes transacionais.
  - Frete em modo manual, com origem `05713420`.
  - Nota fiscal direcionada para provider Mercado Pago.
- DNS do Registro.br foi salvo para Vercel e Resend:
  - `A baseforma.com.br -> 216.198.79.1`.
  - `CNAME www.baseforma.com.br -> f81d286f1555399c.vercel-dns-017.com.`
  - Registros DNS de autenticacao do Resend. O prefixo `send` usado pelo SPF/Return-Path nao determina o dominio do endereco remetente.
- A ativacao inicial planejava remetentes em `send.baseforma.com.br`. A verificacao atual no Resend e de `baseforma.com.br`, conforme auditoria de 16/11/2026 abaixo.

## Mercado Pago

O codigo do site ja usa Mercado Pago como pagamento ativo:

- `lib/mercado-pago.js`
- `app/api/payments/mercado-pago/preference/route.js`
- `app/api/webhooks/mercado-pago/route.js`

Estado em 29/06/2026:

- Aplicacao Mercado Pago em Checkout Pro acessada com credenciais produtivas.
- `MERCADO_PAGO_ACCESS_TOKEN` produtivo configurado no Vercel para Production e Preview.
- `MERCADO_PAGO_ENV=production` configurado no Vercel para Production e Preview.
- `MERCADO_PAGO_STATEMENT_DESCRIPTOR=BASEFORMA` confirmado no Vercel para Production e Preview.
- `MERCADO_PAGO_WEBHOOK_SECRET` configurado no Vercel para Production e Preview.
- Production redeploy executado no Vercel e alias `https://www.baseforma.com.br` atualizado.
- Health check administrativo de producao retornou Mercado Pago `ok=true`, modo `production`.

Webhook esperado no painel Mercado Pago:

- URL: `https://baseforma.com.br/api/webhooks/mercado-pago`
- Evento minimo esperado: pagamentos.
- Assinatura secreta deve corresponder ao valor configurado em `MERCADO_PAGO_WEBHOOK_SECRET` no Vercel.

Estado do login nesta sessao:

- Login por e-mail avancou.
- Verificacao por WhatsApp foi selecionada e o codigo foi confirmado.
- Depois disso, Mercado Pago exigiu reconhecimento facial.
- Browser embutido nao conseguiu abrir permissao real de camera; o caminho recomendado e concluir a validacao facial no Brave ja logado.

## E-mail

Separacao recomendada:

- Resend: manter para e-mails transacionais do site, como codigo de acesso, pedido criado e pagamento resolvido.
- Google Workspace: usar para caixas humanas do dominio, por exemplo:
  - `atendimento@baseforma.com.br`
  - `pedidos@baseforma.com.br`
  - `conta@baseforma.com.br`
  - `projetos@baseforma.com.br`

Google Workspace e um provedor gerenciado de e-mail com dominio customizado. Para recebimento humano, o MX do dominio raiz deve apontar para o Google Workspace conforme o Admin Console. O Resend usa a autenticacao DKIM do dominio e o prefixo DNS `send` para SPF/Return-Path, sem substituir o MX de recebimento do dominio raiz. Esse prefixo nao significa que o endereco remetente deva terminar em `@send.baseforma.com.br`.

Auditoria de 16/11/2026 no painel do Resend:

- Dominio cadastrado: somente `baseforma.com.br`, com status `Verified`, pronto para envio na regiao Sao Paulo.
- A chave usada pelo site tem `Sending access` para `All domains`; nao foi necessario alterar a chave ou suas permissoes.
- O aviso de expedicao foi recusado com HTTP 403 porque usava `Baseforma <pedidos@send.baseforma.com.br>`. O log do Resend informa `Domain not verified: Verify send.baseforma.com.br or update your from domain.`
- Configuracao correta: `TRANSACTIONAL_EMAIL_FROM=Baseforma <pedidos@baseforma.com.br>` e `ACCOUNT_EMAIL_FROM=Baseforma <conta@baseforma.com.br>`. `TRANSACTIONAL_EMAIL_REPLY_TO=atendimento@baseforma.com.br` continua sendo a caixa de resposta.
- Aplicar os remetentes em Production e Preview e refazer o deploy para que as funcoes recebam os novos valores. Depois, validar o envio pelo fluxo real e conferir o aceite/entrega no Resend. Nao e necessario adicionar dominio, alterar DNS ou criar nova chave para corrigir essa recusa.

Correcao operacional aplicada em 16/11/2026: ambos os remetentes foram atualizados em Production e Preview. O deploy de producao `dpl_JC5KYz17wpyLTJkn2JsJprPHUB7q` ficou `READY`, mantendo o commit de `main` `1741fccee97860db1ec84b953440e2f5a55d3bdd`. Um envio real pelo fluxo de codigo de acesso do site foi aceito e registrado como `Delivered` no Resend, mensagem `01a1e62b-ee7b-7efc-9fec-50443a5afc91`. Esse teste valida a configuracao e o adaptador de envio compartilhado; nao reenvia o aviso do pedido do cliente.

Nao usar Google Workspace como canal primario dos envios automaticos do app sem uma decisao explicita. Isso evita limite de SMTP, bloqueios por automacao e acoplamento entre inbox humano e transacional.

## Proximo chat

Ordem recomendada:

1. Concluir a validacao facial do Mercado Pago no Brave.
2. Abrir `https://www.mercadopago.com.br/developers/panel/app`.
3. Criar/acessar app da Baseforma.
4. Configurar `MERCADO_PAGO_ACCESS_TOKEN` e webhook no Vercel.
5. Fazer pedido teste em sandbox ou producao controlada, conforme credenciais disponiveis.
6. Concluir Google Workspace para caixas humanas e confirmar DNS de recebimento/autenticacao.
