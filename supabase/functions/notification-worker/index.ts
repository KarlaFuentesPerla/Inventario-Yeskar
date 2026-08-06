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

const jsonHeaders = { "Content-Type": "application/json" };
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
      subject: `Entrega en 2 horas: ${delivery.client_name}`,
      heading: "Entrega próxima",
      message: `Yesi, recuerda que tienes una entrega programada para ${formatDate(delivery.scheduled_for)}.`,
      details: [
        ["Cliente", delivery.client_name], ["Producto", product],
        ["Lugar", delivery.address || "Sin dirección"],
      ],
    };
  }

  return {
    subject: `Ya puedes retirar ${money(delivery.remuneration_amount)}`,
    heading: "Remuneración disponible",
    message: `Ya pasaron 48 horas desde que ${delivery.client_name} recogió su pedido.`,
    details: [
      ["Empresa", delivery.shipping_company || "Empresa de envío"],
      ["Producto", product], ["Total a retirar", money(delivery.remuneration_amount)],
    ],
  };
}

function renderEmail(job: Job) {
  const content = emailFor(job);
  const rows = content.details.map(([label, value]) =>
    `<tr><td style="padding:8px 0;color:#806d77">${htmlEscape(label)}</td><td style="padding:8px 0;text-align:right;font-weight:700;color:#493942">${htmlEscape(value)}</td></tr>`
  ).join("");
  return {
    subject: content.subject,
    html: `<!doctype html><html><body style="margin:0;background:#fff7fa;font-family:Arial,sans-serif;color:#493942"><div style="max-width:560px;margin:0 auto;padding:24px 14px"><div style="background:#ffffff;border:2px solid #eedde5;border-radius:22px;overflow:hidden"><div style="padding:22px;background:linear-gradient(135deg,#b94f78,#d96f91);color:white"><div style="font-size:34px">🐘</div><div style="font-size:12px;font-weight:800;letter-spacing:1px">VARIEDADES YESKAR</div><h1 style="margin:8px 0 0;font-size:27px">${htmlEscape(content.heading)}</h1></div><div style="padding:22px"><p style="font-size:17px;line-height:1.55;margin-top:0">${htmlEscape(content.message)}</p><table style="width:100%;border-collapse:collapse;border-top:1px solid #eedde5;border-bottom:1px solid #eedde5">${rows}</table><p style="margin:20px 0 0;color:#806d77;font-size:13px">Este aviso se generó automáticamente desde el inventario de Yesi.</p></div></div></div></body></html>`,
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
      && (delivery.shipping_mode !== "empresa" || delivery.status !== "recogida"
        || !delivery.collected_at || Boolean(delivery.remuneration_withdrawn_at));
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
          "Content-Type": "application/json",
          "Idempotency-Key": `yeskar-${job.id}`,
        },
        body: JSON.stringify({
          from: "Variedades YesKar <onboarding@resend.dev>",
          to: [recipient], subject: email.subject, html: email.html,
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
