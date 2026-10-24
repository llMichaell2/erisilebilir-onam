-- Archive only: patient data and QR receipts are never removed by this feature.
begin;
create table if not exists public.onam_record_archive(
 record_id uuid primary key references public.consent_records(id),
 archived_at timestamptz not null default now(),
 archived_by uuid not null
);
create table if not exists public.onam_archive_events(
 id uuid primary key default gen_random_uuid(),
 record_id uuid not null references public.consent_records(id),
 action text not null check(action in ('archive','restore')),
 actor_id uuid not null,
 created_at timestamptz not null default now()
);
alter table public.onam_record_archive enable row level security;
alter table public.onam_archive_events enable row level security;
revoke all on public.onam_record_archive,public.onam_archive_events from public,anon,authenticated;
create or replace function public.set_onam_archive(p_record_ids uuid[],p_archived boolean)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare changed integer;
begin
 if not public.onam_is_doctor() then raise exception 'Staff access required' using errcode='42501';end if;
 if p_archived is null or coalesce(cardinality(p_record_ids),0)<1 or cardinality(p_record_ids)>100 or array_position(p_record_ids,null) is not null then raise exception 'Select between 1 and 100 records';end if;
 if exists(select 1 from unnest(p_record_ids) r(id) where not exists(select 1 from public.consent_records c where c.id=r.id)) then raise exception 'Record not found';end if;
 if p_archived then
  with added as (insert into public.onam_record_archive(record_id,archived_by) select distinct unnest(p_record_ids),auth.uid() on conflict do nothing returning record_id)
  insert into public.onam_archive_events(record_id,action,actor_id) select record_id,'archive',auth.uid() from added;
 else
  with removed as (delete from public.onam_record_archive where record_id=any(p_record_ids) returning record_id)
  insert into public.onam_archive_events(record_id,action,actor_id) select record_id,'restore',auth.uid() from removed;
 end if;
 get diagnostics changed=row_count;
 return jsonb_build_object('changed',changed,'archived',p_archived);
end;
$$;
create or replace function public.list_onam_receipts_v2(p_archived boolean default false)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not public.onam_is_doctor() then return null;end if;
 return jsonb_build_object('archive_enabled',true,
 'active_count',(select count(*) from public.consent_records c where not exists(select 1 from public.onam_record_archive a where a.record_id=c.id)),
 'archived_count',(select count(*) from public.onam_record_archive),
 'records',coalesce((select jsonb_agg(row_to_json(r)) from (
  select c.id,c.created_at,c.answers#>>'{name,value}' as patient_name,
   case when c.access_revoked_at is null then receipt.access_token else null end as access_token,
   c.access_revoked_at,a.archived_at,a.archived_by
  from public.consent_records c join public.onam_receipts receipt on receipt.record_id=c.id
  left join public.onam_record_archive a on a.record_id=c.id
  where (a.record_id is not null)=p_archived
  order by c.created_at desc,c.id limit 100
 )r),'[]'::jsonb));
end;
$$;
revoke all on function public.set_onam_archive(uuid[],boolean),public.list_onam_receipts_v2(boolean) from public,anon;
grant execute on function public.set_onam_archive(uuid[],boolean),public.list_onam_receipts_v2(boolean) to authenticated;
notify pgrst,'reload schema';
commit;
