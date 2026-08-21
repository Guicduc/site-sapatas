# Transicao para sistema externo de producao

## Decisao

O site Next.js continua sendo a fonte de verdade comercial. Ele e responsavel por:

- catalogo ativo e configuracoes vendaveis;
- snapshot imutavel dos itens e valores do pedido;
- pagamento, nota fiscal, conta do cliente e frete;
- estados comerciais e marcos de producao exibidos ao cliente.

CAD, Grasshopper, fatiamento, jobs de impressora, leases, retries, maquinas e artefatos gerados pertencem ao sistema externo de producao. Esses dados tecnicos nao devem virar uma segunda fonte de verdade comercial nem criar estados CAD no pedido.

O limite de integracao do site esta implementado em `docs/ops/production-system-integration.md`: pull autenticado de trabalho pago, acknowledgement idempotente e retorno somente de `accepted`, `produced` e `failed`. O sistema externo, sua homologacao e o corte operacional ainda nao existem; a integracao fica desativada por padrao.

## Estado durante a transicao

O site ja possui uma fila local `print_jobs` para gerar arquivos a partir do contrato CAD. `lib/cad-contract.js` monta o payload e participa da ingestao dessa fila; `lib/print-job-store.js` persiste snapshots, idempotencia, leases, retries, artefatos e erros. As rotas `/api/admin/print-jobs/*` sao protegidas por acesso administrativo.

Essa fila e uma ponte operacional existente, nao o sistema externo acordado. Ela deve permanecer ativa ate que o sistema externo exista, os jobs ativos tenham sido migrados ou reconciliados e exista um corte idempotente com rollback operacional claro. `production_work_routes` impede que um pedido seja roteado simultaneamente para a ponte e para o pull externo.

Enquanto a ponte existir:

- o pedido pago e seu snapshot continuam no site;
- a operacao pode sincronizar pedidos pagos para `print_jobs`;
- o processamento CAD/slice continua fora do processo web;
- artefatos e estados tecnicos da fila nao bloqueiam nem alteram o estado comercial do pedido;
- o unico operador registra os marcos comerciais no admin existente.

## Fluxo alvo

1. O site cria o pedido local, recalcula seus valores no servidor e persiste o snapshot comercial.
2. O pagamento aprovado torna o trabalho elegivel para a API de producao.
3. O sistema externo busca o trabalho pelo contrato autenticado, repete o pull ate o acknowledgement e usa apenas o snapshot comprado necessario para fabricar.
4. O sistema externo executa CAD, Grasshopper, slice e impressao, incluindo sua propria operacao de maquinas, leases, retries e artefatos.
5. O sistema externo envia eventos idempotentes de marcos comerciais; o site persiste apenas o estado necessario para admin e conta do cliente.
6. No inicio, o operador continua podendo registrar esses marcos manualmente no admin para nao depender da integracao externa.

O contrato usa `workId`, `eventId`, marco e instante. O payload e allowlisted e nao aceita evento tecnico interno, texto livre de erro ou alteracao comercial fora das regras do site. `shipped` ficou fora da versao 1 para preservar as regras atuais de expedicao e notificacao.

## Corte obrigatorio

Nao remover nem desativar a fila atual antes de todos os pontos abaixo estarem atendidos:

- contrato externo aprovado e API autenticada testada;
- leitura idempotente de trabalho pago validada com snapshots reais e de teste;
- jobs atuais listados, concluídos, cancelados ou migrados com reconciliação por item;
- responsabilidade por leases, retries, maquinas, artefatos e falhas transferida explicitamente;
- recebimento idempotente de marcos testado na conta do cliente e no admin;
- procedimento de corte, observacao, duplicidade e rollback documentado;
- operador treinado para o fluxo manual de contingencia.

O corte deve ser feito uma vez por uma regra deterministica, sem criar jobs duplicados nem permitir que o mesmo trabalho seja processado simultaneamente pela fila antiga e pelo sistema externo.

## Catalogo e validacao

O registro de produtos continua manual. Cada novo manifesto precisa ser importado e ordenado em `lib/product-registry.js`, e as paginas editoriais/familias relacionadas precisam ser revisadas manualmente. Nao propor descoberta automatica de produtos como parte desta transicao.

`catalog/product.schema.json` e a referencia estrutural, mas a validacao operacional atual e parcial: `npm run product:check` cobre um subconjunto do schema e tambem invariantes entre arquivos. A ativacao continua dependendo dos checks de catalogo, CAD, slice, preco, imagens e revisao humana.

O `schemaVersion` atual de `orders.metadata.fulfillment` e `2`. Esse numero e independente do `schemaVersion` dos `print_jobs`.

## Fora de escopo

- substituir o checkout proprio ou o Mercado Pago;
- mover catalogo, pedido, pagamento, NF-e, conta, frete ou marcos do cliente para o sistema externo;
- gerar descoberta automatica do registry;
- declarar a migracao concluida antes do contrato, da reconciliacao e do corte idempotente.
