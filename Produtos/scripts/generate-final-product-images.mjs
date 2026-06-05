import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const outDir = path.join(root, "public", "products");

const W = 1200;
const H = 900;

const colors = {
  ink: "#111111",
  graphite: "#202225",
  charcoal: "#34383b",
  line: "#c8c0b3",
  warm: "#f3eee6",
  panel: "#fbfaf7",
  brass: "#c49a5a",
  wood: "#b7895b",
  steel: "#363a3d",
  shadow: "rgba(18, 18, 18, 0.2)"
};

const products = [
  {
    slug: "sapata-lisa-redonda",
    name: "Sapata lisa redonda",
    family: "lisa",
    shape: "round",
    variants: ["sem haste", "com haste", "18 mm", "40 mm", "preta"]
  },
  {
    slug: "sapata-lisa-quadrada",
    name: "Sapata lisa quadrada",
    family: "lisa",
    shape: "square",
    variants: ["sem haste", "com haste", "30 x 30", "60 x 60", "preta"]
  },
  {
    slug: "sapata-tubo-redondo",
    name: "Sapata para tubo redondo",
    family: "tubo",
    shape: "tube-round",
    variants: ["18 mm", "25 mm", "40 mm", "encaixe interno", "preta"]
  },
  {
    slug: "sapata-tubo-quadrado",
    name: "Sapata para tubo quadrado",
    family: "tubo",
    shape: "tube-square",
    variants: ["20 x 20", "30 x 30", "50 x 50", "encaixe interno", "preta"]
  },
  {
    slug: "sapata-tubo-oblongo",
    name: "Sapata para tubo oblongo",
    family: "tubo",
    shape: "tube-oblong",
    variants: ["oval", "oblongo", "baixo perfil", "encaixe interno", "preta"]
  }
];

const imageTypes = [
  { slug: "hero", title: "Produto solo" },
  { slug: "variacoes", title: "Variações de tamanho e forma" },
  { slug: "montagem", title: "Ilustração de montagem" },
  { slug: "aplicacao", title: "Aplicação realista" }
];

function esc(text) {
  return String(text).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;"
  })[char]);
}

function baseSvg(content, title, subtitle = "") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fbfaf7"/>
      <stop offset="0.58" stop-color="#f1ebe1"/>
      <stop offset="1" stop-color="#e3d8ca"/>
    </linearGradient>
    <linearGradient id="rubber" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4b4f51"/>
      <stop offset="0.42" stop-color="#1d1f20"/>
      <stop offset="1" stop-color="#080909"/>
    </linearGradient>
    <linearGradient id="rubberTop" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5b6063"/>
      <stop offset="1" stop-color="#191b1c"/>
    </linearGradient>
    <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="24" stdDeviation="18" flood-color="#111" flood-opacity="0.22"/>
    </filter>
    <filter id="smallShadow" x="-40%" y="-40%" width="180%" height="180%">
      <feDropShadow dx="0" dy="10" stdDeviation="9" flood-color="#111" flood-opacity="0.18"/>
    </filter>
    <pattern id="grain" width="120" height="120" patternUnits="userSpaceOnUse">
      <path d="M0 18 C30 8 62 28 120 13 M0 58 C34 48 74 66 120 52 M0 96 C28 88 72 108 120 91" fill="none" stroke="#8f6b49" stroke-opacity=".16" stroke-width="2"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="48" y="48" width="1104" height="804" rx="28" fill="rgba(255,255,255,.38)" stroke="rgba(44,38,31,.1)"/>
  <text x="82" y="104" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#6b6257" letter-spacing="2">${esc(title.toUpperCase())}</text>
  ${subtitle ? `<text x="82" y="136" font-family="Arial, Helvetica, sans-serif" font-size="38" font-weight="700" fill="#111">${esc(subtitle)}</text>` : ""}
  ${content}
</svg>`;
}

function roundShoe(x, y, s = 1, neck = false) {
  return `<g transform="translate(${x} ${y}) scale(${s})" filter="url(#softShadow)">
    ${neck ? `<path d="M-34 -112 h68 c9 0 16 7 16 16 v95 h-100 v-95 c0-9 7-16 16-16z" fill="url(#rubber)" stroke="#6b6f70" stroke-width="3"/>` : ""}
    <ellipse cx="0" cy="0" rx="160" ry="54" fill="#080909"/>
    <rect x="-160" y="-76" width="320" height="76" fill="url(#rubber)"/>
    <ellipse cx="0" cy="-76" rx="160" ry="54" fill="url(#rubberTop)" stroke="#72777a" stroke-width="3"/>
    <ellipse cx="0" cy="-77" rx="112" ry="31" fill="none" stroke="#111" stroke-opacity=".48" stroke-width="8"/>
    <path d="M-108 -54 C-48 -28 54 -28 112 -56" fill="none" stroke="#777d80" stroke-opacity=".34" stroke-width="5"/>
  </g>`;
}

function squareShoe(x, y, s = 1, neck = false) {
  return `<g transform="translate(${x} ${y}) scale(${s})" filter="url(#softShadow)">
    ${neck ? `<path d="M-34 -112 h68 c9 0 16 7 16 16 v94 h-100 v-94 c0-9 7-16 16-16z" fill="url(#rubber)" stroke="#6b6f70" stroke-width="3"/>` : ""}
    <path d="M-176 -26 L-92 42 H110 L184 -26 V-84 H-176 Z" fill="url(#rubber)"/>
    <path d="M-176 -84 L-92 -148 H110 L184 -84 L92 -20 H-92 Z" fill="url(#rubberTop)" stroke="#72777a" stroke-width="3"/>
    <path d="M-121 -84 L-62 -126 H76 L128 -84 L68 -45 H-68 Z" fill="none" stroke="#111" stroke-opacity=".48" stroke-width="8"/>
    <path d="M-92 42 V-20 M110 42 V-20" stroke="#73787a" stroke-opacity=".28" stroke-width="5"/>
  </g>`;
}

function tubePlug(x, y, kind, s = 1) {
  const top = kind === "tube-round"
    ? `<ellipse cx="0" cy="-132" rx="118" ry="45" fill="url(#rubberTop)" stroke="#74797b" stroke-width="3"/><ellipse cx="0" cy="-134" rx="74" ry="24" fill="#121314" stroke="#656a6d" stroke-width="5"/>`
    : kind === "tube-oblong"
      ? `<rect x="-136" y="-176" width="272" height="86" rx="43" fill="url(#rubberTop)" stroke="#74797b" stroke-width="3"/><rect x="-92" y="-154" width="184" height="42" rx="21" fill="#121314" stroke="#656a6d" stroke-width="5"/>`
      : `<path d="M-124 -92 L-63 -141 H78 L130 -92 L64 -48 H-72 Z" fill="url(#rubberTop)" stroke="#74797b" stroke-width="3"/><path d="M-78 -94 L-42 -121 H51 L85 -94 L45 -69 H-47 Z" fill="#121314" stroke="#656a6d" stroke-width="5"/>`;
  return `<g transform="translate(${x} ${y}) scale(${s})" filter="url(#softShadow)">
    <path d="M-118 -132 h236 v116 h-236z" fill="url(#rubber)"/>
    ${top}
    <ellipse cx="0" cy="0" rx="154" ry="47" fill="#080909"/>
    <rect x="-154" y="-58" width="308" height="58" fill="url(#rubber)"/>
    <ellipse cx="0" cy="-58" rx="154" ry="47" fill="url(#rubberTop)" stroke="#717679" stroke-width="3"/>
  </g>`;
}

function product(product, x, y, s = 1, options = {}) {
  if (product.shape === "round") return roundShoe(x, y, s, options.neck);
  if (product.shape === "square") return squareShoe(x, y, s, options.neck);
  return tubePlug(x, y, product.shape, s);
}

function labels(items, x, y) {
  return items.map((item, i) => `<g transform="translate(${x} ${y + i * 42})">
    <circle cx="0" cy="-7" r="5" fill="#111"/>
    <text x="18" y="0" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="700" fill="#1c1a17">${esc(item)}</text>
  </g>`).join("");
}

function heroSvg(p) {
  return baseSvg(`
    <ellipse cx="620" cy="704" rx="330" ry="42" fill="${colors.shadow}"/>
    ${product(p, 620, 595, 1.28, { neck: false })}
    <text x="82" y="777" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#111">TPU preto fosco • fabricação sob medida</text>
    <text x="82" y="814" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#5d554c">Imagem de catálogo para produto solo, com geometria limpa e sombra neutra.</text>
  `, "Produto solo", p.name);
}

function variantsSvg(p) {
  const xs = [250, 500, 750, 990];
  const opts = p.family === "lisa"
    ? [{ s: .55, neck: false }, { s: .72, neck: false }, { s: .68, neck: true }, { s: .88, neck: true }]
    : [{ s: .52 }, { s: .65 }, { s: .78 }, { s: .94 }];
  return baseSvg(`
    <line x1="120" y1="642" x2="1080" y2="642" stroke="#d1c8bc" stroke-width="3"/>
    ${xs.map((x, i) => product(p, x, 610, opts[i].s, opts[i])).join("")}
    ${p.variants.slice(0, 4).map((v, i) => `<text x="${xs[i]}" y="744" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="23" font-weight="700" fill="#171512">${esc(v)}</text>`).join("")}
    <text x="82" y="814" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#5d554c">Escala visual comparativa para comunicar variações de tamanho, forma e configuração.</text>
  `, "Variações", p.name);
}

function assemblySvg(p) {
  const isTube = p.family === "tubo";
  const target = isTube
    ? (p.shape === "tube-round"
      ? `<g transform="translate(610 310)"><ellipse cx="0" cy="0" rx="124" ry="42" fill="#52575a"/><rect x="-124" y="-220" width="248" height="220" fill="#303336"/><ellipse cx="0" cy="-220" rx="124" ry="42" fill="#646a6d"/><ellipse cx="0" cy="0" rx="83" ry="24" fill="#151718"/></g>`
      : p.shape === "tube-oblong"
        ? `<g transform="translate(610 310)"><rect x="-142" y="-222" width="284" height="222" rx="50" fill="#303336"/><rect x="-142" y="-44" width="284" height="88" rx="44" fill="#646a6d"/><rect x="-92" y="-19" width="184" height="38" rx="19" fill="#151718"/></g>`
        : `<g transform="translate(610 310)"><path d="M-110 0 L-54 42 H72 L126 0 V-220 H-110 Z" fill="#303336"/><path d="M-110 0 L-54 -42 H72 L126 0 L68 42 H-54 Z" fill="#646a6d"/><path d="M-70 0 L-35 -22 H45 L80 0 L42 22 H-35 Z" fill="#151718"/></g>`)
    : `<g transform="translate(610 306)"><rect x="-230" y="-62" width="460" height="72" rx="8" fill="${colors.wood}"/><rect x="-230" y="-62" width="460" height="72" rx="8" fill="url(#grain)"/></g>`;
  return baseSvg(`
    ${target}
    <path d="M610 430 L610 500" stroke="#111" stroke-width="5" stroke-dasharray="12 12"/>
    <path d="M586 476 L610 506 L634 476" fill="none" stroke="#111" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    ${product(p, 610, 680, .82, { neck: p.family === "lisa" })}
    ${labels(isTube ? ["medir parte interna", "encaixar por pressão", "base apoiada no piso"] : ["alinhar na base", "fixar com haste ou apoio", "contato plano no piso"], 82, 640)}
  `, "Montagem", p.name);
}

function applicationSvg(p) {
  const isTube = p.family === "tubo";
  const leg = isTube
    ? `<rect x="575" y="196" width="70" height="470" rx="${p.shape === "tube-round" ? 35 : 8}" fill="${colors.steel}"/>`
    : `<rect x="450" y="205" width="300" height="440" rx="18" fill="${colors.wood}"/><rect x="450" y="205" width="300" height="440" rx="18" fill="url(#grain)"/>`;
  return baseSvg(`
    <rect x="0" y="660" width="1200" height="240" fill="#d9cebf"/>
    <path d="M0 690 H1200" stroke="#b9aa98" stroke-width="2"/>
    <ellipse cx="612" cy="700" rx="230" ry="36" fill="rgba(0,0,0,.18)"/>
    ${leg}
    ${product(p, 610, 707, .58, { neck: false })}
    <text x="82" y="775" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#111">Aplicação em mobiliário</text>
    <text x="82" y="812" font-family="Arial, Helvetica, sans-serif" font-size="18" fill="#5d554c">Cena renderizada para mostrar proporção, contato com o piso e acabamento preto fosco.</text>
  `, "Aplicação", p.name);
}

function svgFor(type, product) {
  if (type.slug === "hero") return heroSvg(product);
  if (type.slug === "variacoes") return variantsSvg(product);
  if (type.slug === "montagem") return assemblySvg(product);
  return applicationSvg(product);
}

await fs.mkdir(outDir, { recursive: true });

const manifest = [];

for (const p of products) {
  for (const type of imageTypes) {
    const file = `${p.slug}-${type.slug}.png`;
    const rel = `/products/${file}`;
    const abs = path.join(outDir, file);
    await sharp(Buffer.from(svgFor(type, p)))
      .png({ compressionLevel: 9, quality: 95 })
      .toFile(abs);
    manifest.push({
      product: p.slug,
      productName: p.name,
      type: type.slug,
      title: type.title,
      src: rel
    });
  }
}

await fs.writeFile(
  path.join(outDir, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

console.log(`Generated ${manifest.length} images in ${path.relative(root, outDir)}`);
