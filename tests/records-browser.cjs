const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');const id='00000000-0000-4000-8000-000000000099';
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const context=await browser.newContext();let submitted=[],readBeforeLogin=0,loggedIn=false;
 await context.route('https://onam.test/**',route=>{
  const name=new URL(route.request().url()).pathname.slice(1)||'index.html';
  if(name==='config.js')return route.fulfill({contentType:'application/javascript',body:"window.ONAM_CONFIG={supabaseUrl:'https://records.test',supabaseKey:'public-test-key'}"});
  if(name==='audio/manifest.json')return route.fulfill({contentType:'application/json',body:'{"clips":{}}'});
  return route.fulfill({contentType:name.endsWith('.js')?'application/javascript':name.endsWith('.json')?'application/json':'text/html',body:fs.readFileSync(path.join(root,name),'utf8')});
 });
 const snapshot=JSON.parse(fs.readFileSync(path.join(root,'index.html'),'utf8').match(/const data = (\[[\s\S]*?\]);/)[1]);
 await context.route('https://records.test/**',async route=>{
  const request=route.request(),url=new URL(request.url());const headers={'Access-Control-Allow-Origin':'https://onam.test'};
  if(request.method()==='OPTIONS')return route.fulfill({status:204,headers:{...headers,'Access-Control-Allow-Methods':'GET,POST','Access-Control-Allow-Headers':'apikey,authorization,content-type'}});
  if(url.pathname.includes('rpc/submit_consent')){submitted.push(request.postDataJSON());return route.fulfill({status:submitted.length===1?503:200,headers,contentType:'application/json',body:submitted.length===1?'{}':JSON.stringify(id)})}
  if(url.pathname==='/auth/v1/token'){loggedIn=true;return route.fulfill({headers,contentType:'application/json',body:JSON.stringify({access_token:'doctor-test-token'})})}
  if(url.pathname==='/auth/v1/logout')return route.fulfill({status:204,headers});
  if(url.pathname==='/rest/v1/consent_records'){
   if(!loggedIn)readBeforeLogin++;
   assert.equal(request.headers().authorization,'Bearer doctor-test-token');
   const row={id,created_at:'2026-10-24T11:30:00Z',form_version:'bt-mr-photo-v1',answers:submitted.at(-1).p_answers,form_snapshot:snapshot};
   return route.fulfill({headers,contentType:'application/json',body:JSON.stringify([row])});
  }
  throw Error('Unexpected service request');
 });
 const patient=await context.newPage();await patient.addInitScript(()=>{speechSynthesis.speak=()=>{};speechSynthesis.cancel=()=>{}});await patient.goto('https://onam.test/');await patient.locator('#qa-open').click();
 for(const value of ['Örnek Kişi','10000000146','07.06.2005','05381234567','24.10.2026 14:30','Onam formunu okudum, anladım, onaylıyorum']){await patient.locator('#qa-answer').fill(value);await patient.locator('#qa-submit').click();await patient.locator('#qa-confirm').click()}
 await patient.locator('#qa-save-retry').waitFor({state:'visible'});assert.equal(await patient.locator('#qa-receipt').isVisible(),false);
 await patient.locator('#qa-save-retry').click();await patient.locator('#qa-qr svg').waitFor();assert.equal(submitted.length,2);assert.equal(submitted[0].p_submission_id,submitted[1].p_submission_id);
 const link=await patient.locator('#qa-record-link').getAttribute('href');assert.equal(link,'https://onam.test/doctor.html#record='+id);assert.ok(!link.includes('10000000146'));assert.ok(!link.includes('Örnek'));
 const qrDecoder=require.resolve('jsqr/dist/jsQR.js');await patient.addScriptTag({path:qrDecoder});
 const decoded=await patient.evaluate(async()=>{const svg=document.querySelector('#qa-qr svg');const blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'});const url=URL.createObjectURL(blob);try{const img=new Image();img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=canvas.height=600;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,600,600);const data=ctx.getImageData(0,0,600,600);return jsQR(data.data,600,600)?.data}finally{URL.revokeObjectURL(url)}});assert.equal(decoded,link);
 const doctor=await context.newPage();await doctor.goto(link);assert.equal(await doctor.locator('#record-panel').isVisible(),false);assert.equal(readBeforeLogin,0);
 await doctor.locator('#email').fill('doctor@example.test');await doctor.locator('#password').fill('test-only-password');await doctor.locator('#login-button').click();await doctor.locator('#record-panel').waitFor({state:'visible'});
 assert.match(await doctor.locator('#record-details').textContent(),/Örnek Kişi/);assert.equal(await doctor.locator('#record-form h3').count(),6);assert.equal(await doctor.locator('#password').inputValue(),'');assert.equal(await doctor.evaluate(()=>localStorage.length),0);
 await doctor.locator('#logout').click();assert.equal(await doctor.locator('#record-panel').isVisible(),false);assert.equal(await doctor.locator('#record-details').textContent(),'');
 await patient.locator('#qa-clear').click();assert.equal(await patient.locator('#qa-receipt').isVisible(),false);assert.equal(await patient.locator('#qa-qr').textContent(),'');
 console.log('PASS: save failure hides QR; retry uses same submission; real QR decodes to opaque record link; doctor login required; form/text rendered after login; logout/clear removes visible data (cloud HTTP mocked)');
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
