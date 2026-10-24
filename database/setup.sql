-- Run once in the project's Supabase SQL editor as the project administrator.
begin;
create table if not exists public.onam_forms(version text primary key, snapshot jsonb not null);
create table if not exists public.onam_doctors(user_id uuid primary key references auth.users(id) on delete cascade);
create table if not exists public.consent_records(
 id uuid primary key default gen_random_uuid(),
 submission_id uuid unique not null,
 created_at timestamptz not null default now(),
 form_version text not null references public.onam_forms(version),
 form_snapshot jsonb not null,
 answers jsonb not null
);
alter table public.onam_forms enable row level security;
alter table public.onam_doctors enable row level security;
alter table public.consent_records enable row level security;
revoke all on public.onam_forms,public.onam_doctors,public.consent_records from anon,authenticated;
create or replace function public.onam_is_doctor() returns boolean language sql stable security definer set search_path=public,pg_temp as $$
 select exists(select 1 from public.onam_doctors where user_id=auth.uid());
$$;
revoke all on function public.onam_is_doctor() from public;
grant execute on function public.onam_is_doctor() to authenticated;
drop policy if exists doctor_read on public.consent_records;
create policy doctor_read on public.consent_records for select to authenticated using(public.onam_is_doctor());
grant select on public.consent_records to authenticated;
create or replace function public.submit_consent(p_submission_id uuid,p_form_version text,p_answers jsonb)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare k text; v text; tc text; odd_sum integer:=0; even_sum integer:=0; total integer:=0; i integer;
 snapshot jsonb; record_id uuid; previous jsonb; previous_version text; born date; provided_time timestamp;
begin
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
 insert into public.consent_records(submission_id,form_version,form_snapshot,answers)
 values(p_submission_id,p_form_version,snapshot,p_answers) on conflict(submission_id) do nothing returning id into record_id;
 if record_id is null then
  select id,answers,form_version into record_id,previous,previous_version from public.consent_records where submission_id=p_submission_id;
  if previous is distinct from p_answers or previous_version is distinct from p_form_version then raise exception 'Submission conflict';end if;
 end if;
 return record_id;
end;
$$;
revoke all on function public.submit_consent(uuid,text,jsonb) from public;
grant execute on function public.submit_consent(uuid,text,jsonb) to anon,authenticated;
-- Only project administrators can add or change canonical form text.
insert into public.onam_forms(version,snapshot) values ('bt-mr-photo-v1',$form$[{"title": "1. İşlemin açıklaması", "text": "Size önerilen işlem: Bilgisayarlı Tomografi (BT / Tomografi), Manyetik Rezonans Görüntüleme (MR) veya her ikisi.\n\nBT: X-ışınları kullanılarak vücudunuzun kesit halinde görüntülerini alır. Gerektiğinde damardan iyotlu kontrast madde verilebilir.\n\nMR: Güçlü manyetik alan ve radyo dalgaları ile detaylı görüntüler elde edilir. Gerektiğinde gadolinyumlu kontrast madde verilebilir.\n\nBu işlemler, doktorunuzun teşhis koyması veya tedavi planlaması için istenmiştir."}, {"title": "2. Faydalar", "text": "Hastalığınızın tanısını netleştirmek veya mevcut durumu takip etmek.\nAmeliyat / tedavi planlamasına yardımcı olmak.\nDiğer yöntemlere göre daha detaylı görüntü sağlayabilir."}, {"title": "3. Riskler ve oluşabilecek yan etkiler", "text": "Genel oranlar yaklaşık değerlerdir.\n\nBT için:\nRadyasyon maruziyeti (kanser riskini çok az arttırır, özellikle tekrarlayan çekimlerde).\nKontrast alerjisi (kaşıntı, döküntü, nadiren ağır reaksiyon %0,01–0,1).\nBöbrek fonksiyonlarında geçici bozulma (kontrast verilirse).\nGebelikte kullanılmaz (bebeğe zarar verebilir).\n\nMR için:\nManyetik alan nedeniyle metal implant, kalp pili, kulak içi cihaz, metal parça olan kişilerde yasaktır (hayati tehlike yaratabilir).\nKlostrofobi (kapalı alanda panik) – %5–10 oranında.\nKontrast alerjisi (çok nadir, %0,01).\nGürültü (kulak tıkacı verilir).\nHamilelikte ilk 3 ay önerilmez (doktor onayı şart).\n\nOrtak riskler:\nDamar yolu açılmasına bağlı morarma, enfeksiyon.\nÇok nadir anafilaktik şok (ölümcül olabilir, acil müdahale gerektirir)."}, {"title": "4. Alternatif yöntemler", "text": "Ultrason, röntgen, klasik tomografi, endoskopi, laboratuvar testleri veya hiç görüntüleme yapmama. Doktorunuz size en uygun olanı önerdi."}, {"title": "5. Önemli uyarılar", "text": "Hamilelik ihtimaliniz varsa mutlaka söyleyin.\nBöbrek yetmezliği, alerji öyküsü, astım, kalp pili, metal protez, dövme, piercing varsa lütfen belirtin.\nMR’da tüm metal eşyalarınızı (saat, kolye, kredi kartı vb.) çıkaracaksınız.\nKontrast verilecekse 4–6 saat aç kalmanız istenebilir."}, {"title": "6. Onam beyanı", "text": "Yukarıdaki tüm bilgileri okudum, anladım ve sorularım cevaplandı.\nİşlemin faydalarını ve risklerini kabul ediyorum.\nGerektiğinde kontrast madde verilmesini onaylıyorum.\nİstediğim zaman onamı geri çekebileceğimi biliyorum."}]$form$::jsonb) on conflict(version) do nothing;
commit;
