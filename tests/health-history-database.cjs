
const {PGlite}=require('@electric-sql/pglite'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
module.exports=(async()=>{const db=new PGlite();try{
 await db.exec("create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public to anon,authenticated;");
 for(const name of ['setup.sql','qr-access.sql'])await db.exec(fs.readFileSync(root+'/database/'+name,'utf8'));
 const scope={window:{},TextEncoder};vm.runInNewContext(fs.readFileSync(root+'/medical-history.js','utf8'),scope);
 const H=scope.window.OnamHealth;const responses=Object.fromEntries(H.definitions.flatMap(q=>[['history_'+q.id,{value:q.id==='pregnancy'?'Bilmiyorum':'Evet'}],['detail_'+q.id,{value:'ğ'.repeat(90)}]]));
 const values={name:'Test Hasta',tc:'10000000146',birthDate:'05.10.2005',phone:'05381234567',dateTime:'26.10.2026 14:30',declaration:'Onam formunu okudum, anladım, onaylıyorum'};
 const answers=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,{value,confirmedAt:new Date().toISOString()}]));answers.declaration.healthHistory=H.snapshot(responses);
 await db.exec('set role anon');
 const submit=async(id,payload,key)=>(await db.query("select public.submit_consent($1,'bt-mr-photo-v1',$2::jsonb,$3) as id",[id,JSON.stringify(payload),key])).rows[0].id;
 const id=await submit('00000000-0000-4000-8000-000000000001',answers,'a'.repeat(64));assert.equal(await submit('00000000-0000-4000-8000-000000000001',answers,'a'.repeat(64)),id);
 const record=(await db.query('select public.get_consent_by_token($1) as item',['a'.repeat(64)])).rows[0].item;
 assert.deepEqual(record.answers.declaration.healthHistory,JSON.parse(JSON.stringify(answers.declaration.healthHistory)));assert.equal(record.answers.declaration.healthHistory.items[9].answer,'Bilmiyorum');
 const old=structuredClone(answers);delete old.declaration.healthHistory;await submit('00000000-0000-4000-8000-000000000002',old,'b'.repeat(64));const legacy=(await db.query('select public.get_consent_by_token($1) as item',['b'.repeat(64)])).rows[0].item;assert.equal(legacy.answers.declaration.healthHistory,undefined);
 assert.equal(Object.keys(record.answers).length,6);console.log('PASS: existing SQL accepts new health metadata including longest Turkish details, anonymous QR round-trip is exact, idempotency and old records preserved; no migration needed.');
 }finally{await db.close()}})();
