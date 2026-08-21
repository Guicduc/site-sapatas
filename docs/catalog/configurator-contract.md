# Contrato dos configuradores

Este documento define o que deve permanecer igual entre produtos e onde uma geometria pode variar. O manifesto em `catalog/products/` descreve o produto; o configurador compartilhado interpreta esses dados; adaptadores tratam apenas desenho e restricoes geometricas.

## Limites de responsabilidade

### Manifesto do produto

Declarar:

- identidade, categoria, formato e estado;
- parametros, ordem, unidade, limites, passo, valor inicial e dependencias;
- variantes e suas condicoes;
- composicao de SKU;
- contrato CAD e transformacoes de sliders;
- superficie e parametros de precificacao;
- tipo do desenho;
- conteudo publico e imagens.

### Configurador compartilhado

Implementar uma unica vez:

- selecao de formato;
- campos numericos e booleanos;
- sistema de medidas;
- cor, acabamento e quantidade;
- validacao e mensagens;
- preco, prazo e resumo;
- envio ao carrinho;
- acessibilidade e responsividade.

O componente nao deve conter condicionais por `productId`, `categorySlug` ou `formatSlug`. Uma diferenca recorrente deve virar dado declarativo. Uma diferenca geometrica real deve virar adaptador.

### Adaptador de geometria

Cada `drawingType` aponta para uma entrada do registry de geometrias. A entrada pode fornecer:

- componente de desenho tecnico;
- validadores geometricos especificos;
- metadados dos papeis semanticos aceitos.

O adaptador nao calcula preco, nao monta SKU, nao altera carrinho e nao duplica transformacoes CAD.

## Parametros

Tipos suportados inicialmente:

- `dimension`: numero com unidade, limite e passo;
- `boolean`: toggle que pode ativar outros parametros.

Cada parametro dimensional deve possuir `role`. O papel descreve significado geometrico sem acoplar a interface ao nome do slider. Chaves continuam estaveis porque integram SKU, dataset e Grasshopper.

Ao selecionar polegadas, o configurador apresenta e edita as medidas como fracoes binarias em passos de 1/16 de polegada. A interface reduz a fracao para a forma usual, por exemplo `1/4`, `3/8`, `7/16` ou `1 1/4`. O slider, o teclado e a entrada manual seguem o mesmo passo. Os limites exibidos usam a primeira e a ultima fracao de 1/16 contidas no intervalo fabricavel. Ao retornar para milimetros, a interface exibe no maximo uma casa decimal. Valores internos, SKU, precificacao, carrinho, pedido e contrato CAD continuam em milimetros com a precisao original.

Parametros condicionais usam `dependsOn`. Quando a condicao estiver inativa, o parametro:

- nao participa da validacao;
- nao participa do SKU;
- nao participa da precificacao;
- permanece fora da interacao por teclado.

## Variantes

Uma variante publica deve possuir:

- `id` estavel;
- codigo de SKU;
- condicao declarativa, quando houver;
- script e ordem de sliders CAD;
- superficie de precificacao;
- amostras de slice validas antes de `active`.

UI, CAD, dataset, imagens e auditorias devem usar o mesmo `id`.

## Compatibilidade e falhas seguras

- Produto `draft` nunca aparece no catalogo publico.
- Produto `active` sem adaptador, imagem obrigatoria, script CAD ou slice valido falha em `product:check`.
- Configuracao sem preco permanece visivel para correcao, mas nao entra no carrinho.
- Um adaptador desconhecido deve ser detectado no build, nao durante a compra.
- O servidor recalcula o item usando as mesmas definicoes canonicas antes de criar o pedido.

## Checklist visual e funcional

Validar para cada familia:

- desktop e mobile;
- teclado e foco visivel;
- valores minimo, inicial e maximo;
- dependencias ativadas e desativadas;
- configuracao invalida;
- configuracao sem cobertura de slice;
- mudanca de formato;
- SKU, preco e prazo;
- carrinho e pedido;
- payload Grasshopper no admin.
