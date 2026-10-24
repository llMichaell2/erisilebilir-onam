const {PGlite}=require('@electric-sql/pglite');const fs=require('node:fs');const assert=require('node:assert/strict');const path=require('node:path');
(async()=>{const db=new PGlite();try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public to anon,authenticated;`);
 await db.exec(fs.readFileSync(path.join(__dirname,'../database/setup.sql'),'utf8'));
 const answers=Object.fromEntries(Object.entries({name:'Örnek Kişi',tc:'10000000146',birthDate:'07.06.2005',phone:'05381234567',dateTime:'24.10.2026 14:30',declaration:'Onam formunu okudum, anladım, onaylıyorum'}).map(([k,v])=>[k,{value:v,confirmedAt:'2026-10-24T11:30:00Z'}]));
 const submission='00000000-0000-4000-8000-000000000001';
 const submit=async(a=answers,id=submission)=>{const result=await db.query('select public.submit_consent($1::uuid,$2,$3::jsonb) as id',[id,'bt-mr-photo-v1',JSON.stringify(a)]);return result.rows[0].id};
 await db.exec('set role anon');
 const id=await submit();assert.match(id,/^[0-9a-f-]{36}$/);assert.equal(await submit(),id);
 await assert.rejects(db.query('select * from public.consent_records'),/permission denied/);
 await assert.rejects(db.query('select * from public.onam_doctors'),/permission denied/);
 await assert.rejects(db.query('insert into public.consent_records(submission_id,form_version,form_snapshot,answers) values(gen_random_uuid(),\'bt-mr-photo-v1\',\'[]\',\'{}\')'),/permission denied/);
 for(const [field,value] of [['tc','45785463200'],['birthDate','31.02.2005'],['phone','123'],['declaration','evet'],['name','Tekad'],['dateTime','24.10.2026 25:00']]){const invalid=structuredClone(answers);invalid[field].value=value;await assert.rejects(submit(invalid))}
 const missing=structuredClone(answers);delete missing.phone;await assert.rejects(submit(missing));
 const changed=structuredClone(answers);changed.name.value='Başka Kişi';await assert.rejects(submit(changed),/Submission conflict/);
 await db.exec('reset role');
 const doc='00000000-0000-4000-8000-000000000011',other='00000000-0000-4000-8000-000000000012';
 await db.query('insert into auth.users values($1),($2)',[doc,other]);await db.query('insert into public.onam_doctors values($1)',[doc]);
 await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[other]);assert.equal((await db.query('select * from public.consent_records')).rows.length,0);
 await assert.rejects(db.query('insert into public.onam_doctors values($1)',[other]),/permission denied/);
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[doc]);const rows=(await db.query('select * from public.consent_records')).rows;assert.equal(rows.length,1);assert.equal(rows[0].id,id);assert.equal(rows[0].form_snapshot.length,6);const source=JSON.parse(fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').match(/const data = (\[[\s\S]*?\]);/)[1]);assert.deepEqual(rows[0].form_snapshot,source);assert.equal(rows[0].answers.tc.value,answers.tc.value);
 await assert.rejects(db.query('update public.consent_records set answers=\'{}\''),/permission denied/);
 console.log('PASS: actual PostgreSQL SQL/RLS, required fields/checksums/dates/declaration, idempotent retry, anonymous read/write denial, non-doctor denial, doctor-only records and immutable form snapshot');
 }finally{await db.close()}})().catch(e=>{console.error(e);process.exit(1)});
