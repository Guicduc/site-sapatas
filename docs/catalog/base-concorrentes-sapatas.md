# Base de concorrentes: sapatas e ponteiras

Fonte: transcricao manual das imagens enviadas em 2026-05-25.

Objetivo: manter uma base consultavel de produto concorrente, preco e equivalencia com o catalogo Traço Base.

Arquivo estruturado: [base-concorrentes-sapatas.csv](./base-concorrentes-sapatas.csv)

## Campos

| Campo | Uso |
| --- | --- |
| `fornecedor` | Nome do fornecedor concorrente. |
| `tipo_concorrente` | Categoria/nome comercial no concorrente. |
| `modelo_concorrente` | Codigo ou descricao do modelo concorrente. |
| `data_orcamento` | Data do preco quando aparece na imagem. |
| `preco_unitario_brl` | Preco unitario antes de IPI. |
| `ipi_percentual` | IPI informado. |
| `preco_final_brl` | Preco final unitario informado. |
| `imagem_ref` | Referencia interna da linha de origem nas imagens. |
| `observacao` | Medida, aplicacao ou observacao do concorrente. |
| `nosso_modelo_comparativo_slug` | Slug da familia Traço Base mais proxima. |
| `nosso_modelo_comparativo_nome` | Nome da familia Traço Base mais proxima. |
| `status_comparativo` | `comparavel`, `comparavel_parcial` ou `sem_comparativo`. |
| `criterio_comparacao` | Justificativa do mapeamento. |
| `confianca` | Confianca da leitura/mapeamento. |

## Familias Traço Base usadas no comparativo

| Slug | Nome | Quando usar |
| --- | --- | --- |
| `sapata-tubo-redondo` | Sapata para tubo redondo | Ponteiras internas para tubo redondo por medida nominal ou diametro. |
| `sapata-tubo-quadrado` | Sapata para tubo quadrado | Ponteiras internas quadradas com aletas. |
| `sapata-lisa-redonda` | Sapata lisa redonda | Sapatas redondas de apoio, inclusive com haste quando a geometria for proxima. |
| `sapata-lisa-quadrada` | Sapata lisa quadrada | Sapatas/capas quadradas lisas sem aletas internas claras. |

## Lacunas identificadas

Itens marcados como `sem_comparativo` indicam oportunidades ou categorias fora do escopo atual:

- batente de encaixe para empilhamento de cadeiras;
- ponteira redonda com rosca/inserto metalico;
- ilhos/tampa de furo;
- tapa-furo recartilhado;
- sapata niveladora completa com rosca;
- porca/rebite para sapata;
- sapata meio cano para arame/base esqui.

## Observacoes

- Os valores foram registrados como numeros decimais em BRL para facilitar importacao em banco de dados ou planilha.
- Linhas repetidas nas imagens foram mantidas porque podem representar repeticao de cotacao, revisao ou duplicidade real da base original.
- O campo `imagem_ref` substitui a imagem do produto por enquanto. Se as imagens individuais forem extraidas depois, esse campo pode virar URL ou caminho de arquivo.
