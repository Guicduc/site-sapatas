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
      subject: "Codigo de acesso a sua conta Traco Base",
      html: renderLayout({
        preview: "Codigo de acesso a sua conta Traco Base",
        title: "Codigo de acesso",
        body: [
          `<p>Use o codigo abaixo para acessar sua conta e consultar seus pedidos.</p>`,
          `<p style="font-size:24px;font-weight:700;letter-spacing:4px;margin:24px 0">${escapeHtml(code)}</p>`,
          `<p>Ele expira em 10 minutos.</p>`
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
        intro: "Recebemos seu pedido e ele ja esta registrado na Traco Base.",
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
        ? `Pagamento aprovado - pedido ${order.orderNumber}`
        : `Pagamento nao aprovado - pedido ${order.orderNumber}`,
      html: renderOrderEmail({
        order,
        title: approved ? "Pagamento aprovado" : "Pagamento nao aprovado",
        intro: approved
          ? "Seu pagamento foi aprovado. Vamos seguir com a preparacao do pedido."
          : "O pagamento do pedido nao foi aprovado. Voce pode tentar novamente pela area do pedido.",
        paymentStatus,
        actionLabel: "Ver pedido"
      }),
      idempotencyKey: `payment-${paymentStatus}-${paymentKey}`
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
  const itemRows = (order.items || [])
    .map((item) => `
      <tr>
        <td style="padding:8px 0;border-bottom:1px solid #eee">${escapeHtml(item.formatName || item.categoryName || "Item")}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center">${escapeHtml(item.quantity || 1)}</td>
        <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right">${formatCurrency(item.totalPriceBrl)}</td>
      </tr>
    `)
    .join("");

  return renderLayout({
    preview: `${title} - ${order.orderNumber}`,
    title,
    body: [
      `<p>${escapeHtml(intro)}</p>`,
      `<p><strong>Pedido:</strong> ${escapeHtml(order.orderNumber)}</p>`,
      paymentStatus ? `<p><strong>Pagamento:</strong> ${escapeHtml(getPaymentStatusLabel(paymentStatus))}</p>` : "",
      itemRows
        ? `<table style="width:100%;border-collapse:collapse;margin:20px 0">
            <thead>
              <tr>
                <th style="padding:8px 0;text-align:left;border-bottom:1px solid #ddd">Item</th>
                <th style="padding:8px 0;text-align:center;border-bottom:1px solid #ddd">Qtd.</th>
                <th style="padding:8px 0;text-align:right;border-bottom:1px solid #ddd">Total</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>`
        : "",
      renderCommerceSummary(order, commerce),
      `<p style="margin:24px 0"><a href="${escapeAttribute(confirmationUrl)}" style="background:#111;color:#fff;text-decoration:none;padding:12px 16px;border-radius:4px;display:inline-block">${escapeHtml(actionLabel)}</a></p>`,
      `<p style="color:#666;font-size:13px">Se voce nao reconhece este pedido, responda este e-mail ou entre em contato com a Traco Base.</p>`
    ].join("")
  });
}

function renderCommerceSummary(order, commerce) {
  const rows = [
    ["Subtotal", commerce.itemsSubtotalBrl ?? calculateItemsSubtotal(order)],
    commerce.discount?.applied ? [`Desconto ${commerce.discount.code || ""}`.trim(), -Number(commerce.discount.amountBrl || 0)] : null,
    commerce.shipping ? [commerce.shipping.serviceName || "Frete", Number(commerce.shipping.amountBrl || 0)] : null,
    ["Total", order.totalBrl]
  ].filter(Boolean);

  return `
    <table style="width:100%;border-collapse:collapse;margin:20px 0">
      <tbody>
        ${rows
          .map(([label, amount], index) => `
            <tr>
              <td style="padding:6px 0;${index === rows.length - 1 ? "font-weight:700;border-top:1px solid #ddd" : ""}">${escapeHtml(label)}</td>
              <td style="padding:6px 0;text-align:right;${index === rows.length - 1 ? "font-weight:700;border-top:1px solid #ddd" : ""}">${formatCurrency(amount)}</td>
            </tr>
          `)
          .join("")}
      </tbody>
    </table>
  `;
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
      <body style="margin:0;background:#f5f5f5;font-family:Arial,Helvetica,sans-serif;color:#111">
        <div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preview)}</div>
        <main style="max-width:600px;margin:0 auto;padding:32px 16px">
          <section style="background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:28px">
            <p style="margin:0 0 18px;color:#666;font-size:13px;letter-spacing:.08em;text-transform:uppercase">Traco Base</p>
            <h1 style="font-size:24px;line-height:1.25;margin:0 0 20px">${escapeHtml(title)}</h1>
            ${body}
          </section>
        </main>
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
