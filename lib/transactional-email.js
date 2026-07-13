import { getPaymentStatusLabel } from "@/lib/order-status";
import { siteUrl } from "@/lib/site-data";

const resendEndpoint = "https://api.resend.com/emails";

export function hasTransactionalEmailProvider() {
  return Boolean(process.env.RESEND_API_KEY && getSender());
}

export async function sendAccountAccessCodeEmail(email, code) {
  if (process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY) {
    return { sent: false, skipped: "missing_resend_api_key" };
  }

  return sendTransactionalEmail(
    {
      to: email,
      subject: "Codigo de acesso a sua conta Baseforma",
      html: renderLayout({
        preview: "Codigo de acesso a sua conta Baseforma",
        title: "Codigo de acesso",
        body: [
          `<p style="margin:0 0 18px;color:#181c1d;font-size:16px;line-height:1.55">Use o codigo abaixo para acessar sua conta e consultar seus pedidos.</p>`,
          `<p style="margin:0 0 18px;padding:18px 20px;background:#edf1ef;border:1px solid #d5ddda;border-radius:8px;color:#004d48;font-family:ui-monospace,SFMono-Regular,Consolas,Liberation Mono,monospace;font-size:28px;line-height:1.2;font-weight:700;text-align:center">${escapeHtml(code)}</p>`,
          `<p style="margin:0;color:#5a6264;font-size:14px;line-height:1.5">Ele expira em 10 minutos.</p>`
        ].join("")
      }),
      idempotencyKey: `account-access-${hashToken(`${email}:${code}`)}`
    },
    { optional: false }
  );
}

export async function notifyOrderCreated(order) {
  if (!order?.customer?.email) {
    return { sent: false, skipped: "missing_customer_email" };
  }

  return sendTransactionalEmail(
    {
      to: order.customer.email,
      subject: `Pedido ${order.orderNumber} recebido`,
      html: renderOrderEmail({
        order,
        title: "Pedido recebido",
        intro: "Recebemos seu pedido e ele ja esta registrado na Baseforma.",
        actionLabel: "Acompanhar pedido"
      }),
      idempotencyKey: `order-created-${order.id}`
    },
    { optional: true }
  );
}

export async function notifyPaymentResolved(order, paymentStatus) {
  if (!["approved", "rejected"].includes(paymentStatus)) {
    return { sent: false, skipped: "payment_status_not_notifiable" };
  }

  if (!order?.customer?.email) {
    return { sent: false, skipped: "missing_customer_email" };
  }

  const approved = paymentStatus === "approved";
  const latestPayment = order.payments?.[0];
  const paymentKey = latestPayment?.providerPaymentId || latestPayment?.id || order.id;

  return sendTransactionalEmail(
    {
      to: order.customer.email,
      subject: approved
        ? `Comprovante de pagamento - pedido ${order.orderNumber}`
        : `Pagamento nao aprovado - pedido ${order.orderNumber}`,
      html: renderOrderEmail({
        order,
        title: approved ? "Comprovante de pagamento" : "Pagamento nao aprovado",
        intro: approved
          ? "Recebemos a confirmacao do pagamento do seu pedido."
          : "O pagamento do pedido nao foi aprovado. Voce pode tentar novamente pela area do pedido.",
        paymentStatus,
        actionLabel: approved ? "" : "Ver pedido"
      }),
      idempotencyKey: `payment-${paymentStatus}-${paymentKey}`
    },
    { optional: true }
  );
}

const paymentReviewReasonLabels = {
  amount_mismatch: "Pagamento aprovado com valor diferente do total do pedido",
  approved_payment_on_cancelled_order: "Pagamento aprovado para um pedido cancelado"
};

export async function notifyInternalPaymentAlert(order, review) {
  const to = process.env.INTERNAL_ALERT_EMAIL || process.env.TRANSACTIONAL_EMAIL_REPLY_TO || getSender();

  if (!order || !review || !to) {
    console.warn("[transactional-email] payment review sem destinatario de alerta", {
      orderId: order?.id || null,
      reason: review?.reason || null
    });
    return { sent: false, skipped: "missing_alert_recipient" };
  }

  const reasonLabel = paymentReviewReasonLabels[review.reason] || review.reason;

  return sendTransactionalEmail(
    {
      to,
      subject: `[Alerta] Pedido ${order.orderNumber} precisa de revisao manual de pagamento`,
      html: renderLayout({
        preview: `Revisao manual de pagamento - ${order.orderNumber}`,
        title: "Revisao manual de pagamento",
        body: [
          `<p style="margin:0 0 18px;color:#181c1d;font-size:16px;line-height:1.55">${escapeHtml(reasonLabel)}.</p>`,
          `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 18px;background:#edf1ef;border:1px solid #d5ddda;border-radius:8px">
            <tbody>
              ${[
                ["Pedido", order.orderNumber],
                ["Status do pedido", order.status],
                ["Pagamento (MP)", review.providerPaymentId || "-"],
                ["Valor pago", review.paidAmountBrl == null ? "-" : formatCurrency(review.paidAmountBrl)],
                ["Valor esperado", formatCurrency(review.expectedAmountBrl)],
                ["Cliente", `${order.customer?.name || "-"} (${order.customer?.email || "sem e-mail"})`]
              ]
                .map(
                  ([label, value]) => `
                    <tr>
                      <td style="padding:10px 16px;color:#5a6264;font-size:13px">${escapeHtml(label)}</td>
                      <td style="padding:10px 16px;color:#181c1d;font-size:13px;font-weight:700;text-align:right">${escapeHtml(value)}</td>
                    </tr>`
                )
                .join("")}
            </tbody>
          </table>`,
          `<p style="margin:0;color:#5a6264;font-size:13px;line-height:1.5">O pedido nao avanca para producao ate a conferencia manual. Verifique o pagamento no painel do Mercado Pago antes de liberar ou estornar.</p>`
        ].join("")
      }),
      idempotencyKey: `payment-review-${review.reason}-${review.providerPaymentId || order.id}`
    },
    { optional: true }
  );
}

async function sendTransactionalEmail(message, { optional = true } = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = getSender();

  if (!apiKey || !from) {
    if (optional) {
      return { sent: false, skipped: !apiKey ? "missing_resend_api_key" : "missing_email_from" };
    }

    throw new Error("O envio de e-mail nao esta configurado.");
  }

  let response;

  try {
    response = await fetch(resendEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey } : {})
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        ...(process.env.TRANSACTIONAL_EMAIL_REPLY_TO
          ? { reply_to: process.env.TRANSACTIONAL_EMAIL_REPLY_TO }
          : {})
      })
    });
  } catch (error) {
    if (optional) {
      console.warn("[transactional-email] network failed", {
        subject: message.subject,
        to: message.to,
        error: error.message
      });
      return { sent: false, skipped: "network_failed", error: error.message };
    }

    throw error;
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data?.message || "Nao foi possivel enviar o e-mail.");
    error.details = data;

    if (optional) {
      console.warn("[transactional-email] send failed", {
        status: response.status,
        subject: message.subject,
        to: message.to,
        error: error.message
      });
      return { sent: false, skipped: "send_failed", error: error.message };
    }

    throw error;
  }

  return { sent: true, id: data?.id || null };
}

function renderOrderEmail({ order, title, intro, paymentStatus, actionLabel }) {
  const commerce = order.metadata?.commerce || {};
  const confirmationUrl = `${getPublicBaseUrl()}/pedido-confirmado?orderId=${encodeURIComponent(order.id)}`;
  const statusLabel = paymentStatus ? getPaymentStatusLabel(paymentStatus) : "Pedido recebido";
  const latestPayment = order.payments?.[0];
  const paymentDate = paymentStatus === "approved"
    ? formatDateTime(latestPayment?.updatedAt || latestPayment?.createdAt || order.updatedAt)
    : "";
  const itemRows = (order.items || [])
    .map((item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #d5ddda;color:#181c1d;line-height:1.4">${escapeHtml(item.formatName || item.categoryName || "Item")}</td>
        <td style="padding:12px 8px;border-bottom:1px solid #d5ddda;text-align:center;color:#5a6264">${escapeHtml(item.quantity || 1)}</td>
        <td style="padding:12px 0;border-bottom:1px solid #d5ddda;text-align:right;color:#181c1d;font-weight:700">${formatCurrency(item.totalPriceBrl)}</td>
      </tr>
    `)
    .join("");

  return renderLayout({
    preview: `${title} - ${order.orderNumber}`,
    title,
    body: [
      `<p style="margin:0 0 20px;color:#181c1d;font-size:16px;line-height:1.55">${escapeHtml(intro)}</p>`,
      `<table role="presentation" style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#edf1ef;border:1px solid #d5ddda;border-radius:8px">
        <tbody>
          <tr>
            <td style="padding:16px;border-right:1px solid #d5ddda;vertical-align:top">
              <p style="margin:0 0 6px;color:#5a6264;font-size:12px;line-height:1.3">Pedido</p>
              <p style="margin:0;color:#181c1d;font-size:17px;line-height:1.25;font-weight:700">${escapeHtml(order.orderNumber)}</p>
            </td>
            <td style="padding:16px;vertical-align:top">
              <p style="margin:0 0 6px;color:#5a6264;font-size:12px;line-height:1.3">${paymentStatus ? "Pagamento" : "Status"}</p>
              <p style="margin:0;color:#004d48;font-size:17px;line-height:1.25;font-weight:700">${escapeHtml(statusLabel)}</p>
            </td>
          </tr>
          ${paymentDate
            ? `<tr>
                <td style="padding:16px;border-top:1px solid #d5ddda;border-right:1px solid #d5ddda;vertical-align:top">
                  <p style="margin:0 0 6px;color:#5a6264;font-size:12px;line-height:1.3">Confirmado em</p>
                  <p style="margin:0;color:#181c1d;font-size:15px;line-height:1.35;font-weight:700">${escapeHtml(paymentDate)}</p>
                </td>
                <td style="padding:16px;border-top:1px solid #d5ddda;vertical-align:top">
                  <p style="margin:0 0 6px;color:#5a6264;font-size:12px;line-height:1.3">Total pago</p>
                  <p style="margin:0;color:#181c1d;font-size:15px;line-height:1.35;font-weight:700">${formatCurrency(latestPayment?.amountBrl || order.totalBrl)}</p>
                </td>
              </tr>`
            : ""}
        </tbody>
      </table>`,
      itemRows
        ? `<p style="margin:0 0 8px;color:#181c1d;font-size:14px;line-height:1.4;font-weight:700">Itens do pedido</p>
          <table style="width:100%;border-collapse:collapse;margin:0 0 24px">
            <thead>
              <tr>
                <th style="padding:10px 0;text-align:left;border-bottom:1px solid #9faca7;color:#5a6264;font-size:12px;font-weight:700">Item</th>
                <th style="padding:10px 8px;text-align:center;border-bottom:1px solid #9faca7;color:#5a6264;font-size:12px;font-weight:700">Qtd.</th>
                <th style="padding:10px 0;text-align:right;border-bottom:1px solid #9faca7;color:#5a6264;font-size:12px;font-weight:700">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>`
        : "",
      renderCommerceSummary(order, commerce),
      actionLabel
        ? `<p style="margin:28px 0 18px"><a href="${escapeAttribute(confirmationUrl)}" style="background:#007a70;color:#fbfcfa;text-decoration:none;padding:13px 18px;border-radius:8px;display:inline-block;font-weight:700">${escapeHtml(actionLabel)}</a></p>`
        : "",
      `<p style="margin:0;color:#5a6264;font-size:13px;line-height:1.5">Se voce nao reconhece este pedido, responda este e-mail ou entre em contato com a Baseforma.</p>`
    ].join("")
  });
}

function renderCommerceSummary(order, commerce) {
  const rows = [
    ["Subtotal", commerce.itemsSubtotalBrl ?? calculateItemsSubtotal(order)],
    commerce.discount?.applied ? [`Desconto ${commerce.discount.code || ""}`.trim(), -Number(commerce.discount.amountBrl || 0)] : null,
    commerce.shipping ? [getCustomerShippingLabel(commerce.shipping), Number(commerce.shipping.amountBrl || 0)] : null,
    ["Total", order.totalBrl]
  ].filter(Boolean);

  return `
    <p style="margin:0 0 8px;color:#181c1d;font-size:14px;line-height:1.4;font-weight:700">Resumo comercial</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 24px;background:#fbfcfa;border-top:1px solid #d5ddda;border-bottom:1px solid #d5ddda">
      <tbody>
        ${rows
          .map(([label, amount], index) => `
            <tr>
              <td style="padding:${index === rows.length - 1 ? "12px" : "9px"} 0;color:${index === rows.length - 1 ? "#181c1d" : "#5a6264"};${index === rows.length - 1 ? "font-weight:700;border-top:1px solid #9faca7" : ""}">${escapeHtml(label)}</td>
              <td style="padding:${index === rows.length - 1 ? "12px" : "9px"} 0;text-align:right;color:#181c1d;${index === rows.length - 1 ? "font-weight:700;border-top:1px solid #9faca7" : ""}">${formatCurrency(amount)}</td>
            </tr>
          `)
          .join("")}
      </tbody>
    </table>
  `;
}

function getCustomerShippingLabel(shipping = {}) {
  const serviceName = String(shipping.serviceName || "").trim();

  if (shipping.source === "melhor_envio" && serviceName) {
    return serviceName;
  }

  if (serviceName && /correios/i.test(serviceName)) {
    return "Correios manual";
  }

  if (String(shipping.state || "").toUpperCase() === "SP") {
    return "Entrega regional";
  }

  return "Frete";
}

function renderLayout({ preview, title, body }) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>${escapeHtml(title)}</title>
      </head>
      <body style="margin:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;color:#181c1d">
        <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preview)}</div>
        <table role="presentation" style="width:100%;border-collapse:collapse;background:#f5f7f4">
          <tbody>
            <tr>
              <td style="padding:32px 16px">
                <table role="presentation" style="width:100%;max-width:640px;margin:0 auto;border-collapse:separate;border-spacing:0;background:#fbfcfa;border:1px solid #d5ddda;border-radius:8px;overflow:hidden">
                  <tbody>
                    <tr>
                      <td style="padding:24px 28px 20px;background:#edf1ef;border-bottom:1px solid #d5ddda">
                        <p style="margin:0;color:#181c1d;font-size:22px;line-height:1;font-weight:700">Baseforma</p>
                        <p style="margin:8px 0 0;color:#5a6264;font-size:13px;line-height:1.4">Componentes tecnicos sob medida para mobiliario</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:28px">
                        <h1 style="font-size:26px;line-height:1.22;margin:0 0 16px;color:#181c1d;font-weight:700">${escapeHtml(title)}</h1>
                        ${body}
                      </td>
                    </tr>
                    <tr>
                      <td style="padding:18px 28px 24px;border-top:1px solid #d5ddda;background:#f5f7f4">
                        <p style="margin:0;color:#5a6264;font-size:12px;line-height:1.5">Baseforma envia este e-mail para registrar atualizacoes da sua compra. Para atendimento, responda esta mensagem.</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  `;
}

function getSender() {
  return process.env.TRANSACTIONAL_EMAIL_FROM || process.env.ACCOUNT_EMAIL_FROM || "";
}

function getPublicBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return siteUrl.replace(/\/$/, "");
}

function calculateItemsSubtotal(order) {
  return (order.items || []).reduce((sum, item) => sum + Number(item.totalPriceBrl || 0), 0);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

function formatDateTime(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo"
  }).format(date);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function hashToken(value) {
  let hash = 0;
  for (const char of String(value)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(16);
}
