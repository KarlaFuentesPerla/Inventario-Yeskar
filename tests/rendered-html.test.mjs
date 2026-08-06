import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders the Variedades YesKar application shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /<html lang="es">/i);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1"\/>/i);
  assert.match(html, /<title>Variedades YesKar — Productos y entregas<\/title>/i);
  assert.match(html, /Abriendo Variedades YesKar/);
});

test("keeps cloud persistence and mobile-first controls in the source", async () => {
  const [page, css, client] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/supabase.ts", import.meta.url), "utf8"),
  ]);
  assert.match(client, /createClient/);
  assert.match(client, /persistSession:\s*true/);
  assert.match(page, /supabase\.auth\.signInWithPassword/);
  assert.match(page, /supabase\.from\("products"\)\.upsert/);
  assert.match(page, /supabase\.from\("categories"\)/);
  assert.match(page, /supabase\.from\("reservations"\)\.upsert/);
  assert.match(page, /supabase\.from\("deliveries"\)\.upsert/);
  assert.match(page, /deliveryClientByReservationDbId/);
  assert.match(page, /\.in\("status",\["programada","recogida"\]\)/);
  assert.match(page, /type="number"/);
  assert.match(css, /@media\s*\(min-width:\s*720px\)/);
  assert.match(css, /min-height:\s*48px/);
});

test("schedules remuneration reminders from the customer delivery time", async () => {
  const [page, worker, migration] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../supabase/functions/notification-worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../supabase/migrations/20260806160000_schedule_remuneration_from_delivery.sql", import.meta.url), "utf8"),
  ]);
  assert.match(page, /d\.mode==="Empresa"&&d\.remuneration/);
  assert.match(worker, /\["no_recogida", "cancelada"\]\.includes\(delivery\.status\)/);
  assert.doesNotMatch(worker, /delivery\.status !== "recogida"/);
  assert.match(migration, /new\.scheduled_for \+ interval '48 hours'/);
  assert.match(migration, /new\.status not in \('no_recogida','cancelada'\)/);
});
