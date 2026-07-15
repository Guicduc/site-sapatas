# Contratos Logicos do Catalogo

## `ProductFamily`

```json
{
  "slug": "sapata-tubo-redondo",
  "nome": "Sapata para tubo redondo",
  "proposta": "Protecao de piso e acabamento superior para pes tubulares.",
  "aplicacoes": ["mesa metalica", "cadeira", "banqueta"],
  "material_padrao": "TPU",
  "cores_disponiveis": ["Grafite", "Areia", "Terracota"],
  "parametros_permitidos": {
    "diametro_base_mm": [20, 25, 30],
    "altura_mm": [8, 12, 16],
    "fixacao": ["press-fit interno"],
    "faixa_tubo_compativel_mm": ["18-19", "22-23", "26-27"]
  },
  "regras_de_compatibilidade": [
    "Usar apenas em tubos dentro da faixa interna validada.",
    "Nao aplicar em cargas acima da recomendacao declarada."
  ]
}
```

## `Variant`

```json
{
  "sku": "BF-RD-PF-2008-GRA",
  "family_slug": "sapata-tubo-redondo",
  "nome_comercial": "Tubo redondo 20 x 8 grafite",
  "dimensions": {
    "base_mm": 20,
    "altura_mm": 8,
    "faixa_compativel_mm": "18-19"
  },
  "color": "Grafite",
  "material": "TPU",
  "finish": "fosco tecnico",
  "sales_unit": "kit-4",
  "price_brl": 34.9,
  "lead_time_days": 5,
  "status": "active",
  "technical_file": "stl/aprovados/BF-RD-PF-2008-GRA.stl"
}
```

## `Order`

```json
{
  "id": "uuid",
  "order_number": "BF-260424-AB12",
  "source": "configurator",
  "status": "pending_payment",
  "payment_status": "pending",
  "total_brl": 234.92,
  "customer": {
    "name": "Cliente",
    "contact": "11999990000",
    "email": "cliente@email.com"
  },
  "items": [
    {
      "sku": "BF-RD-PI-22X28X18",
      "category_slug": "ponteira-interna-tubo",
      "format_slug": "redondo",
      "values": {
        "diametroBase": 28,
        "alturaBase": 6,
        "alturaPescoco": 18,
        "paredeTubo": 1.5
      },
      "color": "Grafite",
      "finish": "fosco tecnico",
      "quantity": 4,
      "unit_price_brl": 58.73,
      "total_price_brl": 234.92
    }
  ]
}
```

### Payload manual para Grasshopper

```json
{
  "contractVersion": "rhino-gh-v2",
  "items": [
    {
      "contractVersion": "rhino-gh-v2",
      "modelVersion": "tube-round-gh-v2",
      "engine": "rhino_grasshopper",
      "generationMode": "local_manual",
      "sourceGh": "Produtos/Scripts-GH/Sapata_Interna_Tubo-Redondo.gh",
      "orderNumber": "BF-260504-AB12",
      "sku": "BF-RD-PI-22X28X18",
      "categorySlug": "ponteira-interna-tubo",
      "formatSlug": "redondo",
      "quantity": 4,
      "units": "mm",
      "configurationParameters": {
        "diametroBase": 28,
        "alturaBase": 6,
        "alturaPescoco": 18,
        "paredeTubo": 1.5
      },
      "parameterTransforms": {
        "diametroBase": { "scale": 1, "offset": 10 }
      },
      "parameters": {
        "diametroBase": 38,
        "alturaBase": 6,
        "alturaPescoco": 18,
        "paredeTubo": 1.5
      },
      "technicalDefaults": {
        "fitAllowanceMm": -0.2,
        "topChamferMm": 0.8,
        "baseBottomChamferMm": 0.6,
        "shoulderRadiusMm": 1.2,
        "meshToleranceMm": 0.15
      },
      "outputs": {
        "stlFileName": "ORDER-BF-260504-AB12-BF-RD-PI-22X28X18.stl",
        "optionalPreviewFileName": "ORDER-BF-260504-AB12-BF-RD-PI-22X28X18.glb"
      }
    }
  ]
}
```

Esse payload e montado sob demanda em `/admin/pedidos`, a partir dos itens ja salvos. `configurationParameters` preserva as medidas informadas pelo cliente; `parameters` contem os valores finais dos sliders depois de aplicar `parameterTransforms`. Ao sincronizar pedidos pagos, esse contrato vira o snapshot imutavel do job. Ele nao e persistido em `Order.metadata`, nao altera o status do pedido e nao bloqueia producao ou expedicao.

Historico de versoes do contrato tecnico:

- `rhino-gh-v1`: cobria apenas tubo redondo, com chaves do catalogo legado (`diametroInterno`, `profundidadeInsercao`, `alturaApoio`).
- `rhino-gh-v2`: cobre os 5 formatos ativos, chaves alinhadas ao catalogo atual, campo `sourceGh` apontando o script Grasshopper e variantes de haste resolvidas pelo toggle `pescoco`.
- `tube-round-gh-v2`: aplica ao slider `diametroBase` o mesmo offset de flange de `+10 mm` usado para gerar e fatiar o dataset, preservando a medida externa publica em `configurationParameters`.

### Como adicionar um produto ao contrato CAD

O registro central e o objeto `CAD_MODELS` em `lib/cad-contract.js`, indexado por `"categorySlug:formatSlug"`. Um formato que nao esta nesse registro continua no fluxo normal do pedido; o admin apenas usa o payload generico com os valores salvos. Ao adicionar uma familia ou formato novo:

1. **Script Grasshopper**: garanta o `.gh` em `Produtos/Scripts-GH/` e anote os sliders que ele espera (ordem e nomes em `Produtos/scripts/gh_export_variations.py`, `PRODUCT_CONFIGS`).
2. **Catalogo**: cadastre o formato em `lib/configurator-data.js`. As chaves de `parameters` do formato sao a fonte da verdade — o contrato le `item.values` por essas chaves.
3. **Registro no contrato**: adicione a entrada em `CAD_MODELS` com:
   - `modelVersion`: novo id em `CAD_MODEL_VERSION` (padrao `<modelo>-gh-v1`);
   - `sourceGh`: caminho do script Grasshopper;
   - `parameterKeys`: exatamente as chaves que o script GH consome (subconjunto das chaves do catalogo);
   - `sliderTransforms`: transformacoes opcionais aplicadas aos valores publicos antes de preencher sliders do Grasshopper;
   - `technicalDefaults`: folgas/chanfros da familia (press-fit usa `fitAllowanceMm`; base lisa nao);
   - formatos com haste opcional usam `variants: { default, neck }`, resolvidos pelo toggle `pescoco` (normalizado para 0/1 pelo configurador).
4. **Validacao**: crie um pedido de teste no configurador e confira em `/admin/pedidos` que "Dados para Grasshopper" e o JSON copiado trazem os parametros certos (sem zeros inesperados). O pedido deve seguir de pagamento aprovado para `Aguardando producao`, independentemente desse payload.

Atencao aos erros que ja aconteceram: chave de parametro divergente entre catalogo e contrato produz payload com zeros silenciosos (o contrato faz `Number(values[key] || 0)`). Isso afeta o trabalho manual, mas nao o estado operacional do pedido.

### `Order.metadata.pricing`

```json
{
  "mode": "sliced",
  "source": "orca_slicer",
  "orcaVersion": "2.3.0",
  "profileId": "default",
  "materialGrams": 18.4,
  "printMinutes": 74,
  "directCostBrl": 12.68,
  "suggestedPriceBrl": 30.9,
  "calculatedAt": "2026-05-05T23:20:00.000Z",
  "gcodeFileName": "ORDER-BF-260504-AB12-BF-RD-PI-22X28X18.gcode"
}
```

Regras:

- `sliced`: calculo real gerado por Orca Slicer a partir do STL registrado;
- estimativas geometricas nao devem ser usadas como fonte comercial publica;
- o resultado do Orca nao altera automaticamente o preco cobrado do pedido;
- erros de Orca ficam em `metadata.pricing.error` para diagnostico operacional;
- resultados anteriores podem ser preservados em `metadata.pricing.previousResults` para calibracao.

## `Payment`

```json
{
  "provider": "mercado_pago",
  "provider_preference_id": "1234567890",
  "provider_payment_id": "9876543210",
  "status": "approved",
  "checkout_url": "https://www.mercadopago.com.br/checkout/...",
  "amount_brl": 234.92
}
```

## `SpecialRequest`

```json
{
  "family_reference": "sapata-tubo-redondo",
  "desired_dimensions": {
    "base_mm": 28,
    "altura_mm": 14,
    "faixa_compativel_mm": "24-25"
  },
  "use_context": "mesa de jantar com pe metalico curvo",
  "finish": "fosco tecnico",
  "quantity": 24,
  "attachments": ["foto-pe-atual.jpg", "croqui-medidas.pdf"],
  "notes": "evitar leitura muito industrial"
}
```

## `SEOPage`

```json
{
  "slug": "sapata-tubo-redondo",
  "keyword_primary": "sapata para tubo redondo",
  "search_intent": "transacional",
  "title": "Sapata para tubo redondo impressa em 3D | Baseforma",
  "description": "Sapata sob encomenda para pes tubulares com medidas e cores padronizadas.",
  "content_sections": ["hero", "compatibilidade", "matriz", "faq"],
  "internal_links": ["/catalogo", "/projeto-especial"]
}
```

## Regras de interface

- cada familia precisa de pagina publica propria;
- cada familia deve expor matriz de medidas e cores ou tabela equivalente;
- apenas configuracoes dentro dos ranges validados podem gerar pagamento direto;
- configuracoes fora dos ranges viram pedido `needs_technical_review`;
- `SpecialRequest` deve ser acionavel no contexto da familia atual;
- o contrato deve ser portavel para pedido proprio e Mercado Pago sem mudar a taxonomia base.

