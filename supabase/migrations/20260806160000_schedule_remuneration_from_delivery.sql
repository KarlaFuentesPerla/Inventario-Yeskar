create or replace function public.sync_delivery_notification_jobs()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.status = 'programada' then
    insert into public.notification_jobs (
      business_id, delivery_id, notification_type, scheduled_for, status, attempts, last_error, updated_at
    )
    values (
      new.business_id, new.id, 'entrega_2_horas', new.scheduled_for - interval '2 hours',
      'pendiente', 0, null, now()
    )
    on conflict (delivery_id, notification_type) do update
    set scheduled_for = excluded.scheduled_for,
        status = case when public.notification_jobs.status = 'enviada' then 'enviada' else 'pendiente' end,
        attempts = case when public.notification_jobs.status = 'enviada' then public.notification_jobs.attempts else 0 end,
        last_error = case when public.notification_jobs.status = 'enviada' then public.notification_jobs.last_error else null end,
        updated_at = now();
  else
    update public.notification_jobs
    set status = 'cancelada', updated_at = now()
    where delivery_id = new.id
      and notification_type = 'entrega_2_horas'
      and status in ('pendiente','procesando','fallida');
  end if;

  if new.shipping_mode = 'empresa'
     and new.status not in ('no_recogida','cancelada') then
    insert into public.notification_jobs (
      business_id, delivery_id, notification_type, scheduled_for, status, attempts, last_error, updated_at
    )
    values (
      new.business_id, new.id, 'remuneracion_48_horas', new.scheduled_for + interval '48 hours',
      'pendiente', 0, null, now()
    )
    on conflict (delivery_id, notification_type) do update
    set scheduled_for = excluded.scheduled_for,
        status = case when public.notification_jobs.status = 'enviada' then 'enviada' else 'pendiente' end,
        attempts = case when public.notification_jobs.status = 'enviada' then public.notification_jobs.attempts else 0 end,
        last_error = case when public.notification_jobs.status = 'enviada' then public.notification_jobs.last_error else null end,
        updated_at = now();
  elsif new.shipping_mode <> 'empresa'
     or new.status in ('no_recogida','cancelada') then
    update public.notification_jobs
    set status = 'cancelada', updated_at = now()
    where delivery_id = new.id
      and notification_type = 'remuneracion_48_horas'
      and status in ('pendiente','procesando','fallida');
  end if;

  return new;
end;
$function$;

update public.deliveries
set scheduled_for = scheduled_for
where shipping_mode = 'empresa';
