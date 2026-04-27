(function () {
  const colorMap = {
    Grafite: "#303533",
    Areia: "#dcc8b2",
    Terracota: "#c7774b",
    "Cinza nevoa": "#9da5a5",
    "Verde mineral": "#7b8b74",
    "Azul petroleo": "#355965"
  };

  let catalogPromise;

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value || 0));
  }

  function buildWhatsAppLink(number, message) {
    return "https://wa.me/" + number + "?text=" + encodeURIComponent(message);
  }

  function getVariantMeasureLabel(variant) {
    const compatible = variant.dimensions && variant.dimensions.compatible_range_mm
      ? " | compativel: " + variant.dimensions.compatible_range_mm
      : "";

    return (
      String(variant.dimensions && variant.dimensions.base_mm ? variant.dimensions.base_mm : "") +
      " x " +
      String(variant.dimensions && variant.dimensions.height_mm ? variant.dimensions.height_mm : "") +
      " mm" +
      compatible
    );
  }

  function getVariantMeasureKey(variant) {
    return [
      variant.dimensions && variant.dimensions.base_mm,
      variant.dimensions && variant.dimensions.height_mm,
      variant.dimensions && variant.dimensions.compatible_range_mm
    ].join("|");
  }

  function loadCatalog() {
    if (!catalogPromise) {
      catalogPromise = fetch("/assets/data/catalog.json").then((response) => {
        if (!response.ok) {
          throw new Error("Nao foi possivel carregar o catalogo.");
        }
        return response.json();
      });
    }

    return catalogPromise;
  }

  function renderReveal() {
    const nodes = document.querySelectorAll(".reveal");
    if (!nodes.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 }
    );

    nodes.forEach((node) => observer.observe(node));
  }

  function buildFamilyCard(family) {
    const tags = (family.applications || [])
      .slice(0, 3)
      .map((item) => '<span class="tag">' + escapeHtml(item) + "</span>")
      .join("");

    const highlights = (family.highlights || [])
      .slice(0, 3)
      .map((item) => "<li>" + escapeHtml(item) + "</li>")
      .join("");

    return (
      '<article class="family-card reveal">' +
      '<div class="family-top">' +
      "<div>" +
      '<p class="eyebrow">' +
      escapeHtml(family.hero_label || "Familia") +
      "</p>" +
      "<h3>" +
      escapeHtml(family.name || "Familia") +
      "</h3>" +
      "<p>" +
      escapeHtml(family.tagline || "") +
      "</p>" +
      "</div>" +
      '<div class="family-price">' +
      "<span>A partir de</span>" +
      "<strong>" +
      escapeHtml(formatCurrency(family.price_from_brl)) +
      "</strong>" +
      "<small>" +
      escapeHtml(family.sales_unit || "kit-4") +
      "</small>" +
      "</div>" +
      "</div>" +
      '<div class="tag-row">' +
      tags +
      "</div>" +
      "<ul>" +
      highlights +
      "</ul>" +
      '<div class="inline-actions">' +
      '<a class="btn btn-primary" href="' +
      escapeHtml(family.url || "/catalogo.html") +
      '">Ver familia</a>' +
      '<a class="btn btn-secondary" href="/projeto-especial.html?familia=' +
      encodeURIComponent(family.slug || "") +
      '">Projeto especial</a>' +
      "</div>" +
      "</article>"
    );
  }

  function getActiveVariants(family) {
    return Array.isArray(family.variants)
      ? family.variants.filter((variant) => variant.status === "active")
      : [];
  }

  function renderHomeFamilies(data) {
    const root = document.getElementById("home-families");
    if (!root) return;

    root.innerHTML = (data.product_families || [])
      .slice(0, 3)
      .map(buildFamilyCard)
      .join("");
  }

  function renderCatalogPage(data) {
    const grid = document.getElementById("catalog-grid");
    const state = document.getElementById("catalog-state");
    const applicationFilter = document.getElementById("filter-application");
    const fixationFilter = document.getElementById("filter-fixation");
    const familySelect = document.getElementById("config-family");
    const sizeSelect = document.getElementById("config-size");
    const colorSelect = document.getElementById("config-color");
    const result = document.getElementById("config-result");

    if (!grid) return;

    const families = Array.isArray(data.product_families) ? data.product_families : [];
    const applications = [...new Set(families.flatMap((family) => family.applications || []))];
    const fixations = [...new Set(families.map((family) => family.fixation).filter(Boolean))];

    function populate(select, values, label) {
      if (!select) return;
      select.innerHTML =
        '<option value="all">' +
        label +
        "</option>" +
        values
          .map(
            (value) =>
              '<option value="' +
              escapeHtml(value) +
              '">' +
              escapeHtml(value) +
              "</option>"
          )
          .join("");
    }

    function populateObjects(select, values, label) {
      if (!select) return;
      select.innerHTML =
        '<option value="">' +
        label +
        "</option>" +
        values
          .map(
            (item) =>
              '<option value="' +
              escapeHtml(item.value) +
              '">' +
              escapeHtml(item.label) +
              "</option>"
          )
          .join("");
    }

    function renderConfiguratorResult(selectedFamily, selectedVariant) {
      if (!result) return;

      if (!selectedFamily) {
        result.innerHTML =
          "<div><p class=\"eyebrow\">Selecao atual</p><h3>Escolha um modelo para ver as combinacoes validas.</h3><p>O objetivo aqui e reduzir erro logo no inicio da compra. Quando a combinacao nao existir, o proprio fluxo aponta para projeto especial.</p></div>";
        return;
      }

      if (!selectedVariant) {
        result.innerHTML =
          "<div><p class=\"eyebrow\">Selecao atual</p><h3>" +
          escapeHtml(selectedFamily.name) +
          "</h3><p>Agora refine por medida e cor para chegar em uma variante ativa do catalogo.</p></div>" +
          '<div class="config-result-actions"><a class="btn btn-secondary" href="' +
          escapeHtml(selectedFamily.url || "/catalogo.html") +
          '">Ver familia completa</a><a class="btn btn-primary" href="/projeto-especial.html?familia=' +
          encodeURIComponent(selectedFamily.slug || "") +
          '">Pedir combinacao especial</a></div>';
        return;
      }

      const whatsMessage =
        "Oi, quero confirmar a compra da variante " +
        selectedVariant.sku +
        " da familia " +
        selectedFamily.name +
        ".";

      result.innerHTML =
        "<div>" +
        '<p class="eyebrow">Variante encontrada</p>' +
        "<h3>" +
        escapeHtml(selectedVariant.label || selectedFamily.name) +
        "</h3>" +
        "<p>" +
        escapeHtml(selectedFamily.tagline || "") +
        "</p>" +
        '<div class="config-result-meta">' +
        '<div class="config-stat"><strong>SKU</strong><span>' +
        escapeHtml(selectedVariant.sku) +
        "</span></div>" +
        '<div class="config-stat"><strong>Preco</strong><span>' +
        escapeHtml(formatCurrency(selectedVariant.price_brl)) +
        "</span></div>" +
        '<div class="config-stat"><strong>Prazo</strong><span>' +
        escapeHtml(String(selectedVariant.lead_time_days || "")) +
        " dias uteis</span></div>" +
        '<div class="config-stat"><strong>Cor</strong><span>' +
        escapeHtml(selectedVariant.color || "") +
        "</span></div>" +
        "</div>" +
        "</div>" +
        '<div class="config-result-actions">' +
        '<a class="btn btn-secondary" href="' +
        escapeHtml(selectedFamily.url || "/catalogo.html") +
        '">Abrir pagina da familia</a>' +
        '<a class="btn btn-primary" href="' +
        escapeHtml(buildWhatsAppLink(data.brand.whatsapp_number, whatsMessage)) +
        '" target="_blank" rel="noopener noreferrer">Confirmar por WhatsApp</a>' +
        "</div>";
    }

    function renderConfigurator() {
      if (!familySelect) return;

      const selectedFamily = families.find((family) => family.slug === familySelect.value);

      if (!selectedFamily) {
        if (sizeSelect) {
          populateObjects(sizeSelect, [], "Selecione primeiro um modelo");
          sizeSelect.disabled = true;
        }
        if (colorSelect) {
          populateObjects(colorSelect, [], "Selecione primeiro uma medida");
          colorSelect.disabled = true;
        }
        renderConfiguratorResult(null, null);
        return;
      }

      const variants = getActiveVariants(selectedFamily);
      const measureMap = new Map();
      variants.forEach((variant) => {
        const key = getVariantMeasureKey(variant);
        if (!measureMap.has(key)) {
          measureMap.set(key, {
            value: key,
            label: getVariantMeasureLabel(variant)
          });
        }
      });

      const measures = Array.from(measureMap.values());
      populateObjects(sizeSelect, measures, "Selecione uma medida");
      sizeSelect.disabled = false;

      const selectedMeasureKey = sizeSelect.value;
      const colorVariants = variants.filter(
        (variant) => getVariantMeasureKey(variant) === selectedMeasureKey
      );

      if (!selectedMeasureKey || !colorVariants.length) {
        populateObjects(colorSelect, [], "Selecione primeiro uma medida");
        colorSelect.disabled = true;
        renderConfiguratorResult(selectedFamily, null);
        return;
      }

      const colors = colorVariants.map((variant) => ({
        value: variant.color,
        label: variant.color
      }));
      populateObjects(colorSelect, colors, "Selecione uma cor");
      colorSelect.disabled = false;

      const selectedVariant = colorVariants.find((variant) => variant.color === colorSelect.value);
      renderConfiguratorResult(selectedFamily, selectedVariant || null);
    }

    function renderGrid() {
      const applicationValue = applicationFilter ? applicationFilter.value : "all";
      const fixationValue = fixationFilter ? fixationFilter.value : "all";
      const filtered = families.filter((family) => {
        const applicationMatch =
          applicationValue === "all" || (family.applications || []).includes(applicationValue);
        const fixationMatch = fixationValue === "all" || family.fixation === fixationValue;
        return applicationMatch && fixationMatch;
      });

      grid.innerHTML = filtered.map(buildFamilyCard).join("");
      if (state) {
        state.textContent = filtered.length
          ? ""
          : "Nenhuma familia corresponde aos filtros atuais.";
      }
      renderReveal();
    }

    populate(applicationFilter, applications, "Todas as aplicacoes");
    populate(fixationFilter, fixations, "Todas as fixacoes");
    populateObjects(
      familySelect,
      families.map((family) => ({ value: family.slug, label: family.name })),
      "Selecione um modelo"
    );

    if (applicationFilter) applicationFilter.addEventListener("change", renderGrid);
    if (fixationFilter) fixationFilter.addEventListener("change", renderGrid);
    if (familySelect) familySelect.addEventListener("change", () => {
      if (sizeSelect) sizeSelect.value = "";
      if (colorSelect) colorSelect.value = "";
      renderConfigurator();
    });
    if (sizeSelect) sizeSelect.addEventListener("change", () => {
      if (colorSelect) colorSelect.value = "";
      renderConfigurator();
    });
    if (colorSelect) colorSelect.addEventListener("change", renderConfigurator);

    renderGrid();
    renderConfigurator();
  }

  function renderFamilyPage(data) {
    const slug = document.body.dataset.familySlug;
    if (!slug) return;

    const family = (data.product_families || []).find((item) => item.slug === slug);
    if (!family) return;

    const variantsRoot = document.getElementById("family-variants");
    const swatchesRoot = document.getElementById("family-swatches");
    const metaRoot = document.getElementById("family-meta");
    const relatedRoot = document.getElementById("family-related");
    const summaryRoot = document.getElementById("family-summary-tags");
    const whatsappLink = document.getElementById("family-whatsapp");

    if (metaRoot) {
      metaRoot.innerHTML = [
        { title: "Fixacao", text: family.fixation },
        { title: "Material base", text: family.default_material },
        { title: "Lead time", text: family.lead_time_days + " dias uteis" },
        { title: "Venda", text: "A partir de " + formatCurrency(family.price_from_brl) + " por " + family.sales_unit }
      ]
        .map(
          (item) =>
            '<article class="spec-card"><strong>' +
            escapeHtml(item.title) +
            "</strong><p>" +
            escapeHtml(item.text) +
            "</p></article>"
        )
        .join("");
    }

    if (summaryRoot) {
      summaryRoot.innerHTML = (family.parameter_summary || [])
        .map((item) => '<span class="chip">' + escapeHtml(item) + "</span>")
        .join("");
    }

    if (swatchesRoot) {
      swatchesRoot.innerHTML = (family.available_colors || [])
        .map((color) => {
          const style = colorMap[color] || "#d87b45";
          return '<span class="swatch" style="--swatch:' + escapeHtml(style) + '">' + escapeHtml(color) + "</span>";
        })
        .join("");
    }

    if (variantsRoot) {
      variantsRoot.innerHTML = getActiveVariants(family)
        .map((variant) => {
          return (
            "<tr>" +
            "<td><strong>" +
            escapeHtml(variant.sku) +
            "</strong><br>" +
            escapeHtml(variant.label || "") +
            "</td>" +
            "<td>" +
            escapeHtml(variant.dimensions.compatible_range_mm || "") +
            "</td>" +
            "<td>" +
            escapeHtml(String(variant.dimensions.height_mm || "")) +
            " mm</td>" +
            "<td>" +
            escapeHtml(variant.color || "") +
            "</td>" +
            '<td class="price-cell"><strong>' +
            escapeHtml(formatCurrency(variant.price_brl)) +
            "</strong><span>" +
            escapeHtml(variant.sales_unit || "") +
            "</span></td>" +
            "<td>" +
            escapeHtml(String(variant.lead_time_days || "")) +
            " dias uteis</td>" +
            "</tr>"
          );
        })
        .join("");
    }

    if (relatedRoot) {
      relatedRoot.innerHTML = (data.product_families || [])
        .filter((item) => item.slug !== slug)
        .map(
          (item) =>
            '<article class="detail-card"><strong>' +
            escapeHtml(item.name) +
            "</strong><p>" +
            escapeHtml(item.tagline || "") +
            '</p><a class="btn btn-secondary" href="' +
            escapeHtml(item.url || "/catalogo.html") +
            '">Ver familia</a></article>'
        )
        .join("");
    }

    if (whatsappLink && data.brand && data.brand.whatsapp_number) {
      const message =
        "Oi, quero comprar a familia " +
        family.name +
        " e confirmar a melhor variante para o meu projeto.";
      whatsappLink.href = buildWhatsAppLink(data.brand.whatsapp_number, message);
    }
  }

  function renderSpecialRequest(data) {
    const form = document.getElementById("special-request-form");
    if (!form) return;

    const familySelect = document.getElementById("brief-family");
    const quantityInput = document.getElementById("brief-quantity");
    const applicationInput = document.getElementById("brief-application");
    const dimensionsInput = document.getElementById("brief-dimensions");
    const finishInput = document.getElementById("brief-finish");
    const colorInput = document.getElementById("brief-color");
    const notesInput = document.getElementById("brief-notes");
    const preview = document.getElementById("brief-preview");
    const whatsappButton = document.getElementById("brief-whatsapp");
    const families = Array.isArray(data.product_families) ? data.product_families : [];

    if (familySelect) {
      familySelect.innerHTML =
        '<option value="">Selecione uma familia</option>' +
        families
          .map((family) => '<option value="' + escapeHtml(family.slug) + '">' + escapeHtml(family.name) + "</option>")
          .join("");
    }

    const query = new URLSearchParams(window.location.search);
    if (familySelect && query.get("familia")) {
      familySelect.value = query.get("familia");
    }

    function selectedFamilyName() {
      if (!familySelect) return "";
      const selected = families.find((family) => family.slug === familySelect.value);
      return selected ? selected.name : "Projeto especial";
    }

    function updatePreview() {
      const lines = [
        "Oi, quero solicitar um projeto especial para sapatas.",
        "Familia de referencia: " + (selectedFamilyName() || "Nao definida"),
        "Aplicacao: " + (applicationInput ? applicationInput.value || "Nao informada" : ""),
        "Medidas desejadas: " + (dimensionsInput ? dimensionsInput.value || "Nao informadas" : ""),
        "Quantidade estimada: " + (quantityInput ? quantityInput.value || "Nao informada" : ""),
        "Cor desejada: " + (colorInput ? colorInput.value || "Nao informada" : ""),
        "Acabamento: " + (finishInput ? finishInput.value || "Nao informado" : ""),
        "Observacoes: " + (notesInput ? notesInput.value || "Nao informadas" : "")
      ];

      const content = lines.join("\n");
      if (preview) preview.textContent = content;
      if (whatsappButton && data.brand && data.brand.whatsapp_number) {
        whatsappButton.href = buildWhatsAppLink(data.brand.whatsapp_number, content);
      }
    }

    [familySelect, quantityInput, applicationInput, dimensionsInput, finishInput, colorInput].forEach((field) => {
      if (field) field.addEventListener("input", updatePreview);
    });

    if (notesInput) notesInput.addEventListener("input", updatePreview);
    updatePreview();
  }

  loadCatalog()
    .then((data) => {
      renderHomeFamilies(data);
      renderCatalogPage(data);
      renderFamilyPage(data);
      renderSpecialRequest(data);
      renderReveal();
    })
    .catch((error) => {
      document.querySelectorAll(".state").forEach((node) => {
        node.textContent = error.message;
      });
      renderReveal();
    });
})();
