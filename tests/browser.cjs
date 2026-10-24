// Run: node tests/browser.cjs (requires Playwright and Chromium).
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 let checks=0;
 try{
  async function pageWithMocks({recognition=true,mobile=false}={}){
   const page=await browser.newPage(mobile?{viewport:{width:375,height:812},isMobile:true,hasTouch:true}:{});
   await page.route('https://onam.test/**',route=>{
    const pathname=new URL(route.request().url()).pathname;
    const file=pathname==='/'?'index.html':pathname.slice(1);
    // Exercise device-speech fallback deterministically; recorded playback has separate checks.
    if(file==='audio/manifest.json')return route.fulfill({contentType:'application/json',body:'{"clips":{}}'});
    const type=file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':file.endsWith('.json')?'application/json':'text/html';
    return route.fulfill({contentType:type,body:fs.readFileSync(path.join(root,file),'utf8')});
   });
   await page.addInitScript(({recognition})=>{
    window.spoken=[];window.speechSynthesisUtterance=undefined;
    window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
    const tr={lang:'tr-TR',voiceURI:'turkish',name:'Türkçe',localService:true};
    Object.defineProperty(window,'speechSynthesis',{value:{speaking:false,paused:false,getVoices(){return [{lang:'en-US',name:'English'},tr]},addEventListener(){},cancel(){this.speaking=false},resume(){this.paused=false},pause(){this.paused=true},speak(u){window.lastUtterance=u;spoken.push({text:u.text,rate:u.rate,lang:u.lang,voice:u.voice?.lang});this.speaking=true;u.onstart?.()}}});
    if(recognition){window.SpeechRecognition=class{start(){window.mic=this;this.history=[];const handler=this.onresult;this.onresult=e=>{this.onspeechstart?.();this.history.push(...Array.from(e.results,r=>Object.assign(Array.from(r),{isFinal:r.isFinal??true})));handler({...e,results:this.history})};this.onstart?.()}abort(){this.onend?.()}}}else{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined}
   },{recognition});
   await page.goto('https://onam.test/');
   return page;
  }
  const p=await pageWithMocks();const errors=[];p.on('pageerror',e=>errors.push(e.message));
  assert.equal(await p.locator('.section').count(),6);
  await p.locator('#play').click();
  for(let i=0;i<150;i++){if(await p.locator('#progressLabel').textContent()==='100%')break;await p.evaluate(()=>lastUtterance.onend())}
  assert.equal(await p.locator('#progressLabel').textContent(),'100%');
  const speech=await p.evaluate(()=>spoken);const all=speech.map(u=>u.text).join(' ');
  assert.ok(all.includes('yüzde sıfır virgül sıfır bir ile yüzde sıfır virgül bir arasında'));
  assert.ok(all.includes('yüzde beş ile yüzde on arasında'));assert.ok(!/%|\bMR\b|\bBT\b/.test(all));
  assert.ok(speech.every(u=>u.voice==='tr-TR'&&u.text.length<200));checks++;
  console.log('PASS: full form, pronunciation, Turkish voice and bounded speech chunks');
  await p.locator('#section-2 button').click();await p.evaluate(()=>window.stale=lastUtterance);
  await p.locator('#stop').click();const n=await p.evaluate(()=>spoken.length);await p.evaluate(()=>stale.onend());assert.equal(await p.evaluate(()=>spoken.length),n);checks++;
  await p.locator('#section-2 button').click();await p.locator('[data-rate="0.75"]').click();await p.evaluate(()=>lastUtterance.onend());assert.equal(await p.evaluate(()=>lastUtterance.rate),.75);assert.match(await p.locator('#currentTitle').textContent(),/^3\./);checks++;
  console.log('PASS: stale callbacks ignored; speed changes without restarting section');
  await p.locator('#qa-open').click();
  assert.equal(await p.locator('#qa-skip').count(),0);
  async function answer(value){await p.locator('#qa-answer').fill(value);await p.locator('#qa-submit').click()}
  async function accept(value){await answer(value);await p.locator('#qa-confirm').click()}
  await answer('');assert.equal(await p.locator('#qa-confirm').isVisible(),false);
  await answer('Tekad');assert.equal(await p.locator('#qa-confirm').isVisible(),false);
  await answer('Deneme Kişi');await p.locator('#qa-correct').click();assert.equal(await p.locator('#qa-answer').inputValue(),'');
  await accept('Örnek Kişi');
  await answer('12345678901');assert.equal(await p.locator('#qa-confirm').isVisible(),false);
  await accept('10000000146');
  await answer('31.02.1990');assert.equal(await p.locator('#qa-confirm').isVisible(),false);
  await accept('15 Haziran 1990');
  await answer('123');assert.equal(await p.locator('#qa-confirm').isVisible(),false);
  await accept('0500 000 00 00');
  assert.ok(await p.locator('#qa-answer').inputValue());
  await answer('24.10.2026 25:12');assert.equal(await p.locator('#qa-confirm').isVisible(),false);
  await accept('24.10.2026 14:30');
  await answer('evet');assert.equal(await p.locator('#qa-confirm').isVisible(),false);
  await answer('Onam formunu okudum anladım onaylamıyorum');assert.equal(await p.locator('#qa-confirm').isVisible(),false);assert.match(await p.locator('#qa-status').textContent(),/Onay vermediniz/);
  await answer('Onam formunu okudum, anladım, onaylıyorum');assert.equal(await p.locator('#qa-confirm').textContent(),'Beyanımı tamamla');
  await p.locator('#qa-listen').click();await p.evaluate(()=>mic.onresult({results:[[{transcript:'evet'}]]}));assert.equal(await p.locator('#qa-result').isVisible(),false);
  await p.locator('#qa-listen').click();await p.evaluate(()=>mic.onresult({results:[[{transcript:'Onam formunu okudum anladım onaylıyorum'}]]}));
  const summary=await p.locator('#qa-summary').textContent();assert.ok(summary.includes('onaylıyorum'));assert.ok(!summary.includes('Atlandı'));checks++;
  const downloadEvent=p.waitForEvent('download');await p.locator('#qa-download').click();const download=await downloadEvent;
  const report=JSON.parse(fs.readFileSync(await download.path(),'utf8'));assert.equal(report.clinicalConsentRecorded,false);assert.equal(report.identityVerified,false);assert.equal(Object.keys(report.answers).length,6);assert.equal(report.answers.tc.value,'10000000146');checks++;
  await p.locator('#qa-clear').click();assert.equal(await p.locator('#qa-summary').textContent(),'');assert.equal(await p.locator('#qa-answer').inputValue(),'');
  console.log('PASS: mandatory fields, format/checksum/date validation, no skip, refusal, exact final declaration, export and deletion');
  await p.locator('#qa-start').click();await p.locator('#qa-listen').click();await p.evaluate(()=>mic.onresult({results:[[{transcript:'Sesli Deneme'}]]}));assert.equal(await p.locator('#qa-confirm').isVisible(),true);
  await p.locator('#qa-listen').click();await p.evaluate(()=>mic.onresult({results:[[{transcript:'düzelteceğim'}]]}));assert.equal(await p.locator('#qa-answer').inputValue(),'');
  await p.locator('#qa-listen').click();await p.evaluate(()=>mic.onresult({results:[[{transcript:'Sesli Örnek'}]]}));
  await p.locator('#qa-listen').click();await p.evaluate(()=>mic.onresult({results:[[{transcript:'bilgilerim doğru'}]]}));assert.match(await p.locator('#qa-question').textContent(),/kimlik/);checks++;
  for(const error of ['not-allowed','network','no-speech','audio-capture']){
   await p.locator('#qa-listen').click();await p.evaluate(error=>{mic.onerror({error});mic.onend()},error);assert.equal(await p.locator('#qa-listen').isEnabled(),true);assert.match(await p.locator('#qa-status').textContent(),/yaz|Yaz/);
  }checks++;
  await p.locator('#qa-listen').click();await p.evaluate(()=>window.staleMic=mic);await p.locator('#qa-reset').click();await p.evaluate(()=>staleMic.onresult({results:[[{transcript:'Geç Gelen'}]]}));assert.equal(await p.locator('#qa-answer').inputValue(),'');checks++;
  assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>localStorage.length),0);
  console.log('PASS: voice answer/correction/confirmation, microphone errors, late-result cancellation; no JS errors or local storage');
  const mobile=await pageWithMocks({recognition:false,mobile:true});await mobile.locator('#qa-start').click();assert.equal(await mobile.locator('#qa-listen').isDisabled(),true);await mobile.locator('#qa-answer').fill('Mobil Deneme');await mobile.locator('#qa-submit').click();await mobile.locator('#qa-confirm').click();
  for(const width of [320,375,768,1280]){await mobile.setViewportSize({width,height:900});assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}checks++;
  console.log('PASS: unsupported recognition uses keyboard; 320/375/768/1280px layouts');
  console.log(`${checks} check groups passed. Audio and recognition mocked; real device audio/network/microphone need manual validation.`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
