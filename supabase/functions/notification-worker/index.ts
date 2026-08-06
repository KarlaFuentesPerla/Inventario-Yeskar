import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.112.1";

type NotificationType = "entrega_2_horas" | "remuneracion_48_horas";

type Job = {
  id: string;
  notification_type: NotificationType;
  scheduled_for: string;
  attempts: number;
  business: {
    name: string;
    entrepreneur_name: string | null;
    notification_email: string | null;
    timezone: string;
  };
  delivery: {
    id: string;
    client_name: string;
    address: string | null;
    shipping_mode: "propio" | "empresa";
    scheduled_for: string;
    shipping_company: string | null;
    remuneration_amount: number | null;
    status: string;
    collected_at: string | null;
    remuneration_withdrawn_at: string | null;
    reservation: {
      quantity: number;
      product: { name: string };
    };
  };
};

const jsonHeaders = { "Content-Type": "application/json; charset=utf-8" };
const htmlEscape = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
}[character] ?? character));
const money = (value: number | null) => new Intl.NumberFormat("es-SV", {
  style: "currency", currency: "USD",
}).format(Number(value ?? 0));

function emailFor(job: Job) {
  const delivery = job.delivery;
  const business = job.business;
  const timezone = business.timezone || "America/El_Salvador";
  const formatDate = (value: string) => new Intl.DateTimeFormat("es-SV", {
    timeZone: timezone, dateStyle: "full", timeStyle: "short",
  }).format(new Date(value));
  const product = `${delivery.reservation.quantity} × ${delivery.reservation.product.name}`;

  if (job.notification_type === "entrega_2_horas") {
    return {
      subject: `Recordatorio de entrega: ${delivery.client_name}`,
      preheader: `Entrega programada para ${formatDate(delivery.scheduled_for)}`,
      heading: "Entrega próxima",
      message: `Hola, Yesi. Tienes una entrega programada dentro de dos horas.`,
      details: [
        ["Fecha y hora", formatDate(delivery.scheduled_for)],
        ["Cliente", delivery.client_name],
        ["Producto", product],
        ["Lugar", delivery.address || "Sin dirección"],
      ],
      closing: "Revisa los detalles y prepara el pedido con tiempo.",
    };
  }

  return {
    subject: "Recordatorio de remuneración · Variedades YesKar",
    preheader: `Solicita ${money(delivery.remuneration_amount)} a ${delivery.shipping_company || "la empresa de envío"}`,
    heading: "Remuneración por retirar",
    message: `Hola, Yesi. Ya pasaron 48 horas desde la entrega programada para ${delivery.client_name}.`,
    details: [
      ["Empresa", delivery.shipping_company || "Empresa de envío"],
      ["Cliente", delivery.client_name],
      ["Producto", product],
      ["Total por retirar", money(delivery.remuneration_amount)],
    ],
    closing: "Recuerda solicitar la remuneración a la empresa de envío.",
  };
}

function renderEmail(job: Job) {
  const content = emailFor(job);
  const rows = content.details.map(([label, value]) =>
    `<tr><td style="padding:11px 0;color:#7d6571;font-size:14px;border-bottom:1px solid #f0dfe7">${htmlEscape(label)}</td><td style="padding:11px 0;text-align:right;font-weight:700;color:#432f39;font-size:14px;border-bottom:1px solid #f0dfe7">${htmlEscape(value)}</td></tr>`
  ).join("");
  const text = [
    "VARIEDADES YESKAR",
    content.heading,
    "",
    content.message,
    "",
    ...content.details.map(([label, value]) => `${label}: ${value}`),
    "",
    content.closing,
    "",
    "Aviso automático del inventario de Variedades YesKar.",
  ].join("\n");

  return {
    subject: content.subject,
    text,
    html: `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${htmlEscape(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#fff7fa;font-family:Arial,Helvetica,sans-serif;color:#432f39">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${htmlEscape(content.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fff7fa">
    <tr>
      <td align="center" style="padding:28px 12px">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #edd9e2;border-radius:20px;overflow:hidden;box-shadow:0 8px 28px rgba(133,64,94,.10)">
          <tr>
            <td style="padding:25px 26px;background:#c85b84;color:#ffffff">
              <div style="font-size:32px;line-height:1" aria-hidden="true">&#128024;</div>
              <div style="margin-top:12px;font-size:11px;font-weight:800;letter-spacing:1.4px">VARIEDADES YESKAR</div>
              <h1 style="margin:8px 0 0;font-family:Georgia,serif;font-size:27px;line-height:1.2;color:#ffffff">${htmlEscape(content.heading)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:25px 26px">
              <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#513d47">${htmlEscape(content.message)}</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-top:1px solid #f0dfe7">${rows}</table>
              <div style="margin-top:20px;padding:14px 16px;background:#fff0f5;border-left:4px solid #c85b84;border-radius:8px;font-size:15px;line-height:1.5;color:#513d47">${htmlEscape(content.closing)}</div>
              <p style="margin:22px 0 0;color:#8c7580;font-size:12px;line-height:1.5">Este es un aviso automático del inventario de Variedades YesKar.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}

Deno.serve(async (request: Request) => {
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!resendApiKey || !supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: "Notification service is not configured" }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const dryRun = body?.dryRun === true;
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("notification_jobs")
    .select(`id,notification_type,scheduled_for,attempts,
      business:businesses!notification_jobs_business_id_fkey(name,entrepreneur_name,notification_email,timezone),
      delivery:deliveries!notification_jobs_delivery_id_fkey(id,client_name,address,shipping_mode,scheduled_for,shipping_company,remuneration_amount,status,collected_at,remuneration_withdrawn_at,
        reservation:reservations!deliveries_reservation_id_fkey(quantity,
          product:products!reservations_product_id_fkey(name)))`)
    .in("status", ["pendiente", "fallida"])
    .lt("attempts", 5)
    .lte("scheduled_for", now)
    .order("scheduled_for", { ascending: true })
    .limit(20);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  const jobs = (data ?? []) as unknown as Job[];
  if (dryRun) return Response.json({ resendConfigured: true, dueJobs: jobs.length });

  let sent = 0;
  let cancelled = 0;
  let failed = 0;
  for (const job of jobs) {
    const attempt = job.attempts + 1;
    const { data: claim } = await supabase.from("notification_jobs")
      .update({ status: "procesando", attempts: attempt, updated_at: now })
      .eq("id", job.id).in("status", ["pendiente", "fallida"]).select("id").maybeSingle();
    if (!claim) continue;

    const delivery = job.delivery;
    const staleDeliveryReminder = job.notification_type === "entrega_2_horas"
      && (delivery.status !== "programada" || new Date(delivery.scheduled_for) <= new Date());
    const staleRemunerationReminder = job.notification_type === "remuneracion_48_horas"
      && (delivery.shipping_mode !== "empresa"
        || ["no_recogida", "cancelada"].includes(delivery.status));
    if (staleDeliveryReminder || staleRemunerationReminder) {
      await supabase.from("notification_jobs").update({ status: "cancelada", updated_at: now }).eq("id", job.id);
      cancelled += 1;
      continue;
    }

    try {
      const recipient = job.business.notification_email;
      if (!recipient) throw new Error("El negocio no tiene correo de notificaciones");
      const email = renderEmail(job);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json; charset=utf-8",
          "Idempotency-Key": `yeskar-${job.id}`,
          "User-Agent": "VariedadesYesKar/1.0",
        },
        body: JSON.stringify({
          from: "Variedades YesKar <onboarding@resend.dev>",
          to: [recipient],
          subject: email.subject,
          html: email.html,
          text: email.text,
          headers: { "X-Entity-Ref-ID": job.id },
          tags: [{ name: "tipo", value: job.notification_type }],
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || `Resend respondió ${response.status}`);

      await supabase.from("notification_jobs").update({
        status: "enviada", sent_at: new Date().toISOString(), last_error: null, updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      const marker = job.notification_type === "entrega_2_horas"
        ? { delivery_reminder_sent_at: new Date().toISOString() }
        : { remuneration_reminder_sent_at: new Date().toISOString() };
      await supabase.from("deliveries").update(marker).eq("id", delivery.id);
      sent += 1;
    } catch (error) {
      await supabase.from("notification_jobs").update({
        status: "fallida", last_error: error instanceof Error ? error.message.slice(0, 500) : "Error desconocido",
        updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      failed += 1;
    }
  }

  return Response.json({ processed: jobs.length, sent, cancelled, failed }, { headers: jsonHeaders });
});
