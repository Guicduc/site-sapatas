// Gera as imagens Open Graph/Twitter por familia e por configurador (1200 x 630, JPEG).
//
// As fotos de produto em public/ sao PNGs de 0,3 a 2,2 MB em 4:3 ou 1:1. Elas cabem nos
// limites de Facebook (8 MB) e X (5 MB), mas o WhatsApp costuma descartar a previa acima de
// ~300 KB e todas as redes recortam para ~1,91:1. Aqui a foto e encaixada inteira num quadro
// 1200 x 630, com as faixas laterais continuando o fundo da foto, e salva como JPEG leve.
//
// Uso: node scripts/build-og-images.mjs   (rode de novo ao trocar a imagem principal de uma
// familia ou categoria; test/structured-data.test.js falha se faltar alguma imagem.)

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

import { productCategories } from "../lib/client-configurator-data.js";
import { families } from "../lib/site-data.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const width = 1200;
const height = 630;
const maxBytes = 300 * 1024;

const targets = [
  ...families.map((family) => ({
    kind: "familias",
    slug: family.slug,
    src: family.image?.src,
    alt: family.image?.alt || family.name
  })),
  ...productCategories.map((category) => ({
    kind: "configurar",
    slug: category.slug,
    src: category.image?.src,
    alt: category.image?.alt || category.name
  }))
];

async function render(target) {
  const source = path.join(publicDir, target.src);
  const output = path.join(publicDir, "og", target.kind, `${target.slug}.jpg`);
  let quality = 82;
  let buffer;

  // A foto entra inteira (fit inside), sem as bordas laterais de poucos pixels que costumam
  // vir com vinheta; as faixas que sobram repetem a nova borda, levemente desfocada, para o fundo
  // continuar sem emenda visivel.
  const resized = await sharp(source)
    .flatten({ background: "#ffffff" })
    .resize(width, height, { fit: "inside" })
    .toBuffer({ resolveWithObject: true });
  const trim = 6;
  const foreground = await sharp(resized.data)
    .extract({
      left: trim,
      top: 0,
      width: resized.info.width - trim * 2,
      height: resized.info.height
    })
    .toBuffer({ resolveWithObject: true });
  const padX = width - foreground.info.width;
  const padY = height - foreground.info.height;
  const backdrop = await sharp(foreground.data)
    .extend({
      left: Math.floor(padX / 2),
      right: Math.ceil(padX / 2),
      top: Math.floor(padY / 2),
      bottom: Math.ceil(padY / 2),
      extendWith: "copy"
    })
    .blur(24)
    .toBuffer();

  do {
    buffer = await sharp(backdrop)
      .composite([{ input: foreground.data, gravity: "center" }])
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
    quality -= 6;
  } while (buffer.length > maxBytes && quality > 40);

  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, buffer);

  return {
    key: `${target.kind}/${target.slug}`,
    url: `/og/${target.kind}/${target.slug}.jpg`,
    alt: target.alt,
    bytes: buffer.length,
    source: target.src
  };
}

const results = [];

for (const target of targets) {
  if (!target.src) {
    console.warn(`Sem imagem para ${target.kind}/${target.slug}; mantem a OG padrao.`);
    continue;
  }

  results.push(await render(target));
}

const manifest = Object.fromEntries(results.map((item) => [
  item.key,
  { url: item.url, width, height, alt: item.alt, source: item.source }
]));
const moduleSource = `// Gerado por scripts/build-og-images.mjs. Nao edite a mao.
export const ogImageManifest = ${JSON.stringify(manifest, null, 2)};
`;

await writeFile(path.join(root, "lib", "og-image-manifest.js"), moduleSource);

for (const item of results) {
  console.info(`${item.url} ${(item.bytes / 1024).toFixed(0)} KB <- ${item.source}`);
}
