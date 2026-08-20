---
name: launch-baseforma-product
description: Create, update, validate, or activate Baseforma catalog products across manifests, shared configurator UI, geometry adapters, Grasshopper CAD, Orca slice pricing, final images, family pages, cart, orders, and admin payloads. Use for new product or variant launches, product parameter changes, CAD or pricing surface changes, product image replacement, and catalog migration work in the site-sapatas repository.
---

# Launch Baseforma Product

Coordinate the repository playbook without duplicating product rules. Keep a product in `draft` until every required artifact and validation is complete.

## Load context

Read these files completely before editing:

- `PRODUCT.md`
- `DESIGN.md`
- `docs/catalog/product-launch-playbook.md`
- `docs/catalog/configurator-contract.md`
- `catalog/README.md`
- `docs/catalog/contracts.md`
- `Produtos/grasshopper_3mf_export_flow.md`

Read `docs/ops/agent-runbook.md` before touching cart, order, admin, payment, shipping, deploy, or operational documentation.

## Follow the workflow

1. Inspect `catalog/products/` and choose the closest product with the same geometry.
2. Create or edit the product manifesto with `status: "draft"`.
3. Reuse an existing `drawingType` when its drawing and geometric constraints match. Add one registered adapter only for a genuinely new geometry. Do not branch the shared configurator by product ID or slug.
4. Keep parameter keys stable across the manifesto, SKU, CAD sliders, dataset, cart, order, and images. Declare new parameters with type, role, unit, limits, step, default, and dependency.
5. Register every public variant with one stable ID, CAD model version, script, slider order, technical defaults, pricing surface, and product image.
6. Add final visual roles under `visuals`: `family`, `product`, `manual`, and `usage`. Use `variantId` and declarative `condition` for variant-specific images. Require human review of geometry, assembly, material, scale, and alt text.
7. Run `npm run product:check -- <productId>` before external CAD or slice work.
8. Generate Grasshopper samples and Orca data only in an environment with Rhino, the product `.gh`, and the repository Orca profiles available. Follow the exact commands in the launch playbook. Never invent geometric fallback pricing.
9. Validate the configurator at minimum, default, and maximum values; exercise dependencies, invalid manufacturing combinations, missing slice coverage, desktop, mobile, keyboard, cart, order recalculation, and admin Grasshopper payload.
10. Change to `active` only after all required gates pass, then repeat the complete validation.

## Preserve contracts

- Preserve existing public slugs and SKU meanings.
- Preserve the local order before payment flow and Mercado Pago.
- Keep shipping and invoice behavior unchanged unless explicitly requested.
- Keep `catalog/` as the product source of truth. Do not add product rules to UI components.
- Keep Grasshopper and Orca outside request-time Next.js execution.
- Keep draft products out of public category and static route generation.
- Treat missing CAD, slice, image, adapter, or validation evidence as a blocker to activation, not as permission to use a fallback.

## Validate

Run focused tests while editing, then finish with:

```powershell
npm test
npm run product:check
npm run pricing:model-check
npm run pricing:check
npm run pricing:audit
npm run build
```

If the task changes checkout or payment, also run the external-checkout scan from `AGENTS.md`.

## Report

Report the product state, changed contracts, generated artifacts, validation results, remaining warnings, and whether activation is safe. Never describe a product as launched while required external Grasshopper, Orca, visual, or browser validation remains incomplete.
