import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFocusNfePayload,
  buildFocusNfeReference,
  getFocusNfeBaseUrl,
  getOrderIdFromFocusNfeReference,
  normalizeFocusNfeEnvironment
} from "../lib/focus-nfe.js";

const baseConfig = {
  environment: "homologacao",
  issuerCnpj: "42616830000198",
  issuerUf: "SP",
  operationNature: "Venda de producao propria",
  cfop: "",
  cfopIntrastate: "5101",
  cfopInterstate: "6107",
  ncm: "3926.30.00",
  productOrigin: "0",
  icmsCsosn: "102",
  pisCst: "49",
  cofinsCst: "49",
  pisRatePercent: 0,
  cofinsRatePercent: 0
};

test("monta payload homologado com campos obrigatorios e totais conciliados", () => {
  const payload = buildFocusNfePayload(buildOrder(), baseConfig, {
    now: new Date("2026-07-21T12:00:00.000Z")
  });

  assert.equal(payload.data_emissao, "2026-07-21T09:00:00-03:00");
  assert.equal(payload.local_destino, 1);
  assert.equal(payload.nome_destinatario, "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL");
  assert.equal(payload.modalidade_frete, 0);
  assert.equal(payload.valor_produtos, 100);
  assert.equal(payload.valor_desconto, 10);
  assert.equal(payload.valor_frete, 18);
  assert.equal(payload.valor_total, 108);
  assert.equal(payload.items[0].valor_desconto, 6);
  assert.equal(payload.items[1].valor_desconto, 4);
  assert.equal(payload.items[0].pis_base_calculo, 54);
  assert.equal(payload.items[0].pis_aliquota_porcentual, 0);
  assert.equal(payload.items[0].pis_valor, 0);
  assert.equal(payload.items[0].cofins_base_calculo, 54);
});

test("usa nome real e CFOP interestadual em producao", () => {
  const payload = buildFocusNfePayload(
    buildOrder({ state: "RJ" }),
    { ...baseConfig, environment: "producao" }
  );

  assert.equal(payload.local_destino, 2);
  assert.equal(payload.nome_destinatario, "Cliente Teste");
  assert.equal(payload.items[0].cfop, "6107");
});

test("rateia centavos de desconto sem divergencia", () => {
  const order = buildOrder();
  order.items = [1, 2, 3].map((index) => ({
    id: `item-${index}`,
    sku: `SKU-${index}`,
    formatName: `Produto ${index}`,
    quantity: 1,
    totalPriceBrl: 0.01
  }));
  order.metadata.commerce.itemsSubtotalBrl = 0.03;
  order.metadata.commerce.discount.amountBrl = 0.02;
  order.metadata.commerce.shipping.amountBrl = 0;
  order.totalBrl = 0.01;

  const payload = buildFocusNfePayload(order, baseConfig);

  assert.deepEqual(payload.items.map((item) => item.valor_desconto || 0), [0.01, 0.01, 0]);
  assert.equal(payload.modalidade_frete, 0);
  assert.equal(payload.valor_total, 0.01);
});

test("limita a descricao dos itens ao tamanho aceito", () => {
  const order = buildOrder();
  order.items[0].formatName = "X".repeat(200);

  const payload = buildFocusNfePayload(order, baseConfig);

  assert.equal(payload.items[0].descricao.length, 120);
});

test("bloqueia total fiscal divergente", () => {
  const order = buildOrder();
  order.totalBrl = 999;

  assert.throws(
    () => buildFocusNfePayload(order, baseConfig),
    (error) => error.code === "focus_nfe_total_mismatch"
  );
});

test("bloqueia endereco e ambiente invalidos antes da API", () => {
  const order = buildOrder();
  order.metadata.shippingAddress.district = "";

  assert.throws(
    () => buildFocusNfePayload(order, { ...baseConfig, environment: "errado" }),
    (error) => error.code === "focus_nfe_payload_invalid"
      && error.message.includes("ambiente Focus NFe")
      && error.message.includes("bairro")
  );
});

test("normaliza ambientes e URLs oficiais", () => {
  assert.equal(normalizeFocusNfeEnvironment("production"), "producao");
  assert.equal(normalizeFocusNfeEnvironment("sandbox"), "homologacao");
  assert.equal(normalizeFocusNfeEnvironment("invalido"), "");
  assert.equal(getFocusNfeBaseUrl("producao"), "https://api.focusnfe.com.br");
  assert.equal(getFocusNfeBaseUrl("homologacao"), "https://homologacao.focusnfe.com.br");
});

test("gera referencia alfanumerica e recupera o UUID do pedido", () => {
  const orderId = "f1234567-89ab-4cde-8123-456789abcdef";
  const reference = buildFocusNfeReference(orderId);

  assert.equal(reference, "BFf123456789ab4cde8123456789abcdef");
  assert.match(reference, /^[a-z0-9]+$/i);
  assert.equal(getOrderIdFromFocusNfeReference(reference), orderId);
  assert.equal(getOrderIdFromFocusNfeReference(orderId), orderId);
});

function buildOrder({ state = "SP" } = {}) {
  return {
    id: "f1234567-89ab-4cde-8123-456789abcdef",
    orderNumber: "BF-260721-TESTE",
    customer: {
      name: "Cliente Teste",
      document: "529.982.247-25"
    },
    items: [
      {
        id: "item-1",
        sku: "SKU-1",
        formatName: "Sapatas redondas",
        values: { diametro: 30 },
        quantity: 2,
        totalPriceBrl: 60
      },
      {
        id: "item-2",
        sku: "SKU-2",
        formatName: "Sapatas quadradas",
        quantity: 1,
        totalPriceBrl: 40
      }
    ],
    totalBrl: 108,
    metadata: {
      shippingAddress: {
        postalCode: "01310-100",
        street: "Avenida Paulista",
        number: "1000",
        complement: "Sala 1",
        district: "Bela Vista",
        city: state === "SP" ? "Sao Paulo" : "Rio de Janeiro",
        state
      },
      commerce: {
        itemsSubtotalBrl: 100,
        discount: { amountBrl: 10 },
        shipping: { amountBrl: 18 }
      }
    }
  };
}
