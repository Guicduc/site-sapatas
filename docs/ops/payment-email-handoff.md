# Handoff de pagamento e e-mail

Atualizado em 29/06/2026.

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
  - Nota fiscal em modo manual.
- DNS do Registro.br foi salvo para Vercel e Resend:
  - `A baseforma.com.br -> 216.198.79.1`.
  - `CNAME www.baseforma.com.br -> f81d286f1555399c.vercel-dns-017.com.`
  - DKIM/SPF/MX do Resend para envio pelo subdominio `send`.
- Dominio `baseforma.com.br` no Resend ficou em verificacao `Pending`, aguardando propagacao DNS.

## Mercado Pago

O codigo do site ja usa Mercado Pago como pagamento ativo:

- `lib/mercado-pago.js`
- `app/api/payments/mercado-pago/preference/route.js`
- `app/api/webhooks/mercado-pago/route.js`

O que falta para habilitar producao:

- Concluir login/validacao de identidade da conta Mercado Pago.
- Criar ou acessar a aplicacao do projeto no painel de desenvolvedores.
- Obter `MERCADO_PAGO_ACCESS_TOKEN`.
- Definir `MERCADO_PAGO_ENV=production` quando a conta estiver pronta para receber pagamentos reais.
- Definir `MERCADO_PAGO_WEBHOOK_SECRET` se o painel fornecer assinatura/secret para webhooks.
- Cadastrar webhook:
  - URL: `https://baseforma.com.br/api/webhooks/mercado-pago`
  - Evento minimo esperado: pagamentos.
- Conferir se o painel exige conta PJ, dados bancarios, validacao facial ou homologacao adicional antes de liberar credenciais de producao.

Estado do login nesta sessao:

- Login por Google no browser embutido travou em `accounts.google.com/gsi/transform`.
- Login por e-mail avancou.
- Verificacao por WhatsApp foi selecionada e o codigo foi confirmado.
- Depois disso, Mercado Pago exigiu reconhecimento facial.
- Browser embutido nao conseguiu abrir permissao real de camera; o caminho recomendado e concluir a validacao facial no Brave ja logado.

## E-mail

Separacao recomendada:

- Resend: manter para e-mails transacionais do site, como codigo de acesso, pedido criado e pagamento resolvido.
- Proton Mail: usar para caixas humanas do dominio, por exemplo:
  - `atendimento@baseforma.com.br`
  - `pedidos@baseforma.com.br`
  - `conta@baseforma.com.br`

Proton Mail nao e self-hosted. Ele e um provedor gerenciado de e-mail com dominio customizado. Se a decisao for Proton, adicionar no DNS os registros exigidos por ele para recebimento e autenticacao de e-mail. Antes de adicionar MX do Proton no dominio raiz, revisar conflito com qualquer recebimento configurado no Resend.

Nao usar Proton como canal primario dos envios automaticos do app sem uma decisao explicita. Isso evita limite de SMTP, bloqueios por automacao e acoplamento entre inbox humano e transacional.

## Proximo chat

Ordem recomendada:

1. Concluir a validacao facial do Mercado Pago no Brave.
2. Abrir `https://www.mercadopago.com.br/developers/panel/app`.
3. Criar/acessar app da Baseforma.
4. Configurar `MERCADO_PAGO_ACCESS_TOKEN` e webhook no Vercel.
5. Fazer pedido teste em sandbox ou producao controlada, conforme credenciais disponiveis.
6. Decidir Proton Mail ou outro provedor para caixas humanas e adicionar DNS correspondente.
