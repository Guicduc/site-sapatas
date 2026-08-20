# Design system

## Contexto de uso

O configurador e usado por compradores de componentes para mobiliario em ambientes de trabalho, geralmente no celular ou em um computador de escritorio, enquanto medem uma peca real. A interface deve privilegiar leitura clara, entrada precisa e confirmacao imediata.

## Direcao

- Registro visual: produto, tecnico, direto e seguro.
- Estrategia de cor: neutros quentes com cor de destaque reservada para acao primaria, selecao e foco.
- Hierarquia: previsivel, com controles familiares de comercio eletronico.
- Densidade: compacta o suficiente para comparar medidas, sem esconder instrucoes ou erros.
- Movimento: apenas para comunicar alteracao de estado, entre 150 e 250 ms, respeitando `prefers-reduced-motion`.

## Tipografia

- Usar a familia tipografica global do site em titulos, campos, botoes e dados.
- Manter textos explicativos entre 65 e 75 caracteres por linha quando houver espaco.
- Usar peso e tamanho, nao cor isolada, para estabelecer hierarquia.
- Manter rotulos e valores tecnicos legiveis em zoom de 200%.

## Controles

Todo controle interativo deve possuir estados `default`, `hover`, `focus-visible`, `active`, `disabled` e `error`.

- Alvo minimo de toque: 44 por 44 px.
- Foco: visivel, com contraste suficiente e sem depender apenas de mudanca de cor.
- Erro: mensagem textual proxima ao campo e associada por atributos ARIA.
- Campo numerico: aceitar teclado, botoes e slider quando o range for adequado.
- Toggle: explicitar o estado atual no texto acessivel.
- Botao primario: reservado para adicionar ao carrinho ou avancar na tarefa.

## Contrato do configurador

Todos os produtos usam a mesma estrutura:

1. Identificacao da categoria e do formato.
2. Selecao de formato quando houver mais de um.
3. Referencia visual e desenho tecnico.
4. Parametros na ordem declarada pelo produto.
5. Cor e acabamento quando aplicaveis.
6. Quantidade, preco, prazo e resumo.
7. Acao de adicionar ao carrinho.

Produtos nao podem alterar essa ordem por codigo especifico. Diferencas geometricas entram por um adaptador registrado em `drawingType`. Diferencas de dados entram no manifesto.

## Estados obrigatorios

- Configuracao valida com preco disponivel.
- Configuracao invalida com explicacao operacional.
- Configuracao fabricavel sem cobertura de slice, sem permissao para adicionar ao carrinho.
- Campo dependente oculto ou desabilitado quando sua condicao nao estiver ativa.
- Formato ou adaptador desconhecido bloqueado antes da publicacao.
- Imagem ausente detectada pelo gate de produto, sem publicar referencia quebrada.

## Responsividade

- Desktop: desenho e controles podem ocupar colunas paralelas.
- Mobile: preservar primeiro a identificacao e os controles; resumo e acao devem continuar proximos.
- Nao reduzir tipografia de forma fluida para acomodar o layout.
- Tabelas e resumos devem reorganizar a estrutura em vez de depender de rolagem horizontal quando houver alternativa simples.

## Acessibilidade

- Atender WCAG 2.2 AA.
- Permitir uso completo por teclado.
- Nao comunicar selecao, sucesso ou erro apenas por cor.
- Fornecer nome acessivel para desenhos, imagens e controles.
- Manter a ordem visual alinhada a ordem do DOM.
- Respeitar preferencia por movimento reduzido.

## Imagens de produto

Cada produto ativo deve registrar imagens nos papeis abaixo:

- `family`: familia e variacoes.
- `product`: produto isolado.
- `manual`: instalacao ou montagem.
- `usage`: aplicacao em contexto.

Cada imagem deve declarar caminho, texto alternativo e revisao humana. O pipeline pode auxiliar a geracao, mas nao publica uma imagem automaticamente.
