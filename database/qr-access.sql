-- Add QR access without deleting existing forms or records. Run the whole file.
begin;
alter table public.consent_records add column if not exists access_token_hash text;
alter table public.consent_records add column if not exists access_revoked_at timestamptz;
create unique index if not exists consent_access_key on public.consent_records(access_token_hash) where access_token_hash is not null;
create table if not exists public.onam_receipts(record_id uuid primary key references public.consent_records(id),access_token text not null);
create table if not exists public.onam_settings(id boolean primary key default true check(id),staff_key_hash text not null);
alter table public.onam_receipts enable row level security;
alter table public.onam_settings enable row level security;
revoke all on public.consent_records,public.onam_receipts,public.onam_settings from anon,authenticated;
drop policy if exists doctor_read on public.consent_records;
-- Disable the old submission endpoint; new records must have their own QR key.
revoke all on function public.submit_consent(uuid,text,jsonb) from public,anon,authenticated;
create or replace function public.submit_consent(p_submission_id uuid,p_form_version text,p_answers jsonb,p_access_token text)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare k text; v text; tc text; odd_sum integer:=0; even_sum integer:=0; total integer:=0; i integer;
 snapshot jsonb; record_id uuid; previous jsonb; previous_version text; born date; provided_time timestamp; token_hash text; old_hash text;
begin
 if p_access_token is null or p_access_token!~'^[a-f0-9]{64}$' then raise exception 'Access key required';end if;
 token_hash:=encode(sha256(convert_to(p_access_token,'UTF8')),'hex');
 if p_submission_id is null or p_form_version is null or p_answers is null or jsonb_typeof(p_answers)<>'object' or octet_length(p_answers::text)>6000 then raise exception 'Invalid form'; end if;
 if (select count(*) from jsonb_object_keys(p_answers))<>6 then raise exception 'Invalid fields'; end if;
 foreach k in array array['name','tc','birthDate','phone','dateTime','declaration'] loop
  if jsonb_typeof(p_answers->k)<>'object' or jsonb_typeof(p_answers->k->'value')<>'string' then raise exception 'Invalid value type';end if;
  v:=p_answers#>>array[k,'value'];
  if v is null or length(trim(v))<1 or length(v)>150 then raise exception 'Required field missing'; end if;
 end loop;
 if length(trim(p_answers#>>'{name,value}'))<3 or position(' ' in trim(p_answers#>>'{name,value}'))=0 then raise exception 'Invalid name'; end if;
 tc:=p_answers#>>'{tc,value}';
 if tc!~'^[1-9][0-9]{10}$' then raise exception 'Invalid TC'; end if;
 for i in 1..9 loop
  if i%2=1 then odd_sum:=odd_sum+substring(tc,i,1)::integer;else even_sum:=even_sum+substring(tc,i,1)::integer;end if;
 end loop;
 for i in 1..10 loop total:=total+substring(tc,i,1)::integer;end loop;
 if ((odd_sum*7-even_sum)%10+10)%10<>substring(tc,10,1)::integer or total%10<>substring(tc,11,1)::integer then raise exception 'Invalid TC checksum';end if;
 if (p_answers#>>'{phone,value}')!~'^0[2-5][0-9]{9}$' then raise exception 'Invalid phone';end if;
 v:=p_answers#>>'{birthDate,value}';
 if v!~'^[0-9]{2}\.[0-9]{2}\.[0-9]{4}$' then raise exception 'Invalid birth date';end if;
 born:=to_date(v,'DD.MM.YYYY');
 if to_char(born,'DD.MM.YYYY')<>v or born<date '1900-01-01' or born>current_date then raise exception 'Invalid birth date';end if;
 v:=p_answers#>>'{dateTime,value}';
 if v!~'^[0-9]{2}\.[0-9]{2}\.[0-9]{4} [0-9]{2}:[0-9]{2}$' then raise exception 'Invalid date time';end if;
 provided_time:=to_timestamp(v,'DD.MM.YYYY HH24:MI')::timestamp;
 if provided_time<timestamp '1900-01-01' or to_char(provided_time,'DD.MM.YYYY HH24:MI')<>v then raise exception 'Invalid date time';end if;
 if (p_answers#>>'{declaration,value}')<>'Onam formunu okudum, anladım, onaylıyorum' then raise exception 'Declaration required';end if;
 select f.snapshot into snapshot from public.onam_forms f where f.version=p_form_version;
 if snapshot is null then raise exception 'Unknown form version';end if;
 -- Idempotency: retrying the same completed form cannot create a second record.
 insert into public.consent_records(submission_id,form_version,form_snapshot,answers,access_token_hash)
 values(p_submission_id,p_form_version,snapshot,p_answers,token_hash) on conflict(submission_id) do nothing returning id into record_id;
 if record_id is null then
  select id,answers,form_version,access_token_hash into record_id,previous,previous_version,old_hash from public.consent_records where submission_id=p_submission_id;
  if previous is distinct from p_answers or previous_version is distinct from p_form_version or old_hash is distinct from token_hash then raise exception 'Submission conflict';end if;
 end if;
 insert into public.onam_receipts(record_id,access_token) values(record_id,p_access_token) on conflict on constraint onam_receipts_pkey do nothing;
 return record_id;
end;
$$;
revoke all on function public.submit_consent(uuid,text,jsonb,text) from public;
grant execute on function public.submit_consent(uuid,text,jsonb,text) to anon,authenticated;
create or replace function public.get_consent_by_token(p_access_token text)
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object('id',id,'created_at',created_at,'form_version',form_version,'answers',answers,'form_snapshot',form_snapshot)
 from public.consent_records where p_access_token ~ '^[a-f0-9]{64}$'
 and access_token_hash=encode(sha256(convert_to(p_access_token,'UTF8')),'hex') and access_revoked_at is null;
$$;
revoke all on function public.get_consent_by_token(text) from public;
grant execute on function public.get_consent_by_token(text) to anon,authenticated;
create or replace function public.list_onam_receipts(p_staff_key text)
returns jsonb language plpgsql stable security definer set search_path=public,pg_temp as $$
begin
 if p_staff_key is null or p_staff_key!~'^[a-f0-9]{64}$' or not exists(
  select 1 from public.onam_settings where staff_key_hash=encode(sha256(convert_to(p_staff_key,'UTF8')),'hex')
 ) then return null;end if;
 return jsonb_build_object('records',coalesce((select jsonb_agg(row_to_json(r)) from (
  select c.id,c.created_at,c.answers#>>'{name,value}' as patient_name,
   case when c.access_revoked_at is null then r.access_token else null end as access_token,
   c.access_revoked_at
  from public.consent_records c join public.onam_receipts r on r.record_id=c.id
  order by c.created_at desc,c.id limit 100
 ) r),'[]'::jsonb));
end;
$$;
revoke all on function public.list_onam_receipts(text) from public;
grant execute on function public.list_onam_receipts(text) to anon,authenticated;
-- Administrator only. Returning a key once avoids publishing a staff password in source code.
create or replace function public.rotate_onam_staff_key()
returns text language plpgsql security definer set search_path=public,pg_temp as $$
declare key text:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
begin
 insert into public.onam_settings(id,staff_key_hash) values(true,encode(sha256(convert_to(key,'UTF8')),'hex'))
 on conflict(id) do update set staff_key_hash=excluded.staff_key_hash;
 return key;
end;
$$;
revoke all on function public.rotate_onam_staff_key() from public,anon,authenticated;
commit;
