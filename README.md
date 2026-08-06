# Variedades YesKar

Aplicación móvil para que Yesi administre productos, categorías, reservas,
ventas y entregas. Los datos se guardan en Supabase y las notificaciones por
correo se procesan mediante una Edge Function programada.

## Requisitos

- Node.js 22 LTS o posterior
- npm
- Acceso al proyecto de Supabase `fmbavjpqbcodbsusjyzs`

## Desarrollo local

```bash
npm ci
npm run dev
```

La clave `sb_publishable_...` es pública y se usa desde el navegador. Copia
`.env.example` a `.env.local` cuando necesites apuntar a otro proyecto. Nunca
coloques en variables `NEXT_PUBLIC_*` la clave `service_role` ni la API de
Resend.

## Verificaciones antes de publicar

```bash
npm run typecheck
npm run lint
npm test
npm run build:vercel
npm audit
```

`npm test` valida también la compilación usada por el hosting de pruebas actual.
Vercel usa `npm run build:vercel`, definido en `vercel.json`.

## Variables para Vercel

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Los secretos `RESEND_API_KEY`, `RESEND_FROM_EMAIL` y
`NOTIFICATION_WORKER_SECRET` permanecen en Supabase Edge Functions; no deben
duplicarse en el frontend ni guardarse en GitHub.

## Operación y mantenimiento

- Revisar cada mes Supabase → Database → Advisors y los registros de la Edge
  Function `notification-worker`.
- Ejecutar `npm audit` y aplicar actualizaciones compatibles al menos una vez al
  mes.
- Probar una reserva, una venta, una entrega propia y una entrega por empresa
  después de cada cambio importante.
- Exportar una copia de las tablas de negocio mensualmente mientras el proyecto
  no tenga copias automáticas adecuadas a su plan.
- Antes de modificar tablas, crear una migración SQL reversible y probarla sin
  datos reales.

## Arquitectura de notificaciones

1. Los cambios en entregas crean o cancelan registros en `notification_jobs`.
2. Supabase Cron ejecuta `notification-worker` cada minuto.
3. La función envía por Resend los recordatorios que ya vencieron y registra su
   resultado para evitar duplicados.

La interfaz nunca contiene la API privada de Resend. El acceso a las tablas está
protegido con RLS y cada registro se limita al negocio de la persona autenticada.
