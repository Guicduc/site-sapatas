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
  "sku": "TB-RD-PF-2008-GRA",
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
  "technical_file": "stl/aprovados/TB-RD-PF-2008-GRA.stl"
}
```

## `Order`

```json
{
  "id": "uuid",
  "order_number": "TB-260424-AB12",
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
      "sku": "TB-RD-PI-22X28X18",
      "category_slug": "ponteira-interna-tubo",
      "format_slug": "redondo",
      "values": {
        "diametroInterno": 22,
        "diametroBase": 28,
        "profundidadeInsercao": 18,
        "alturaApoio": 8
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

### `Order.metadata.cad`

```json
{
  "contractVersion": "rhino-gh-v1",
  "status": "cad_pending",
  "modelVersion": "tube-round-gh-v1",
  "fileName": "ORDER-TB-260504-AB12-TB-RD-PI-22X28X18.stl",
  "generatedAt": "2026-05-04T14:20:00.000Z",
  "items": [
    {
      "contractVersion": "rhino-gh-v1",
      "modelVersion": "tube-round-gh-v1",
      "engine": "rhino_grasshopper",
      "generationMode": "local_manual",
      "orderNumber": "TB-260504-AB12",
      "sku": "TB-RD-PI-22X28X18",
      "categorySlug": "ponteira-interna-tubo",
      "formatSlug": "redondo",
      "quantity": 4,
      "units": "mm",
      "parameters": {
        "diametroInterno": 22,
        "diametroBase": 28,
        "profundidadeInsercao": 18,
        "alturaApoio": 8
      },
      "technicalDefaults": {
        "fitAllowanceMm": -0.2,
        "topChamferMm": 0.8,
        "baseBottomChamferMm": 0.6,
        "shoulderRadiusMm": 1.2,
        "meshToleranceMm": 0.15
      },
      "outputs": {
        "stlFileName": "ORDER-TB-260504-AB12-TB-RD-PI-22X28X18.stl",
        "optionalPreviewFileName": "ORDER-TB-260504-AB12-TB-RD-PI-22X28X18.glb"
      }
    }
  ]
}
```

Estados CAD:

- `pending_payment`: pedido configurado, ainda sem pagamento aprovado;
- `cad_pending`: pagamento aprovado e STL pendente de geracao local;
- `cad_generated`: STL gerado;
- `ready_for_print`: STL registrado e pedido liberado para impressao;
- `not_required`: pedido sem modelo CAD automatizado no v1.

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
  "gcodeFileName": "ORDER-TB-260504-AB12-TB-RD-PI-22X28X18.gcode"
}
```

Regras:

- `sliced`: calculo real gerado por Orca Slicer a partir do STL registrado;
- medidas sem amostra exata devem usar interpolacao entre referencias Orca da mesma familia/formato;
- o resultado do Orca nao altera automaticamente o preco cobrado do pedido;
- erros de Orca ficam em `metadata.pricing.error` para diagnostico operacional;
- resultados anteriores podem ser preservados em `metadata.pricing.previousResults` para calibracao.

## `Payment`

```json
{
  "provider": "mercado_pago",
  "provider_preference_id": "123456",
  "provider_payment_id": "987654",
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
  "title": "Sapata para tubo redondo impressa em 3D | Traco Base",
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
- o contrato deve ser portavel para pedido proprio, Mercado Pago e futura plataforma de comercio sem mudar a taxonomia base.

