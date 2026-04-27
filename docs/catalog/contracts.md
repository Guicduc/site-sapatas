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

