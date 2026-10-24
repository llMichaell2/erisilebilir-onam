-- Password-based staff access. Preserves forms, receipts and patient QR links.
begin;
create or replace function public.list_onam_receipts_authenticated()
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if not public.onam_is_doctor() then return null;end if;
 return jsonb_build_object('records',coalesce((select jsonb_agg(row_to_json(r)) from (
  select c.id,c.created_at,c.answers#>>'{name,value}' as patient_name,
   case when c.access_revoked_at is null then r.access_token else null end as access_token,
   c.access_revoked_at
  from public.consent_records c join public.onam_receipts r on r.record_id=c.id
  order by c.created_at desc,c.id limit 100
 ) r),'[]'::jsonb));
end;
$$;
revoke all on function public.list_onam_receipts_authenticated() from public,anon;
grant execute on function public.list_onam_receipts_authenticated() to authenticated;
-- Old management URLs no longer grant access to the patient inbox.
revoke all on function public.list_onam_receipts(text) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
