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
  async function pageWithMocks({recognition=true,mobile=false,welcome=false,autoplayBlocked=false}={}){
   const page=await browser.newPage(mobile?{viewport:{width:375,height:812},isMobile:true,hasTouch:true}:{});
   await page.route('https://onam.test/**',route=>{
    const pathname=new URL(route.request().url()).pathname;
    const file=pathname==='/'?'index.html':pathname.slice(1);
    // Exercise device-speech fallback deterministically; recorded playback has separate checks.
    if(file==='audio/manifest.json')return route.fulfill({contentType:'application/json',body:'{"clips":{}}'});
    const type=file.endsWith('.css')?'text/css':file.endsWith('.js')?'application/javascript':file.endsWith('.json')?'application/json':'text/html';
    return route.fulfill({contentType:type,body:fs.readFileSync(path.join(root,file),'utf8')});
   });
   await page.addInitScript(({recognition,autoplayBlocked})=>{
    window.spoken=[];window.speechSynthesisUtterance=undefined;
    window.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
    const tr={lang:'tr-TR',voiceURI:'turkish',name:'Türkçe',localService:true};
    Object.defineProperty(window,'speechSynthesis',{value:{speaking:false,paused:false,getVoices(){return [{lang:'en-US',name:'English'},tr]},addEventListener(){},cancel(){this.speaking=false},resume(){this.paused=false},pause(){this.paused=true},speak(u){window.lastUtterance=u;spoken.push({text:u.text,rate:u.rate,lang:u.lang,voice:u.voice?.lang});if(autoplayBlocked&&spoken.length===1){this.speaking=false;u.onerror?.({error:'not-allowed'});return}this.speaking=true;u.onstart?.()}}});
    if(recognition){window.SpeechRecognition=class{start(){window.mic=this;this.history=[];const handler=this.onresult;this.onresult=e=>{this.history.push(...Array.from(e.results,r=>Object.assign(Array.from(r),{isFinal:r.isFinal??true})));handler({...e,results:this.history})};this.onstart?.()}abort(){this.onend?.()}}}else{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined}
   },{recognition,autoplayBlocked});
   await page.route('https://*.supabase.co/**',route=>route.fulfill({status:503,contentType:'application/json',body:'{"message":"Test: no live database requests"}'}));
   await page.goto('https://onam.test/');
   if(!welcome){await page.locator('#welcome-dismiss').click();await page.evaluate(()=>{window.onamSilent=false;document.getElementById('qa-auto').checked=true;window.spoken=[];window.lastUtterance=null})}
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
  await p.evaluate(()=>{const create=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{window.exportBlob=blob;return create(blob)}});
  const downloadEvent=p.waitForEvent('download');await p.locator('#qa-download').click();const download=await downloadEvent;assert.equal(download.suggestedFilename(),'onam-formu.json');
  const report=JSON.parse(await p.evaluate(()=>exportBlob.text()));assert.equal(report.clinicalConsentRecorded,false);assert.equal(report.identityVerified,false);assert.equal(Object.keys(report.answers).length,6);assert.equal(report.answers.tc.value,'10000000146');checks++;
  await p.locator('#qa-clear').click();assert.equal(await p.locator('#qa-summary').textContent(),'');assert.equal(await p.locator('#qa-answer').inputValue(),'');
  console.log('PASS: mandatory fields, format/checksum/date validation, no skip, refusal, exact final declaration, export and deletion');
  await p.locator('#qa-start').click();await p.locator('#qa-listen').click();await p.evaluate(()=>mic.onresult({results:[[{transcript:'Sesli Deneme tamam'}]]}));assert.equal(await p.locator('#qa-confirm').isVisible(),true);
  await p.locator('#qa-listen').click();await p.evaluate(()=>mic.onresult({results:[[{transcript:'düzelteceğim'}]]}));assert.equal(await p.locator('#qa-answer').inputValue(),'');
  await p.locator('#qa-listen').click();await p.evaluate(()=>mic.onresult({results:[[{transcript:'Sesli Örnek tamam'}]]}));
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
  const slow=await pageWithMocks({mobile:true});
  async function finishPrompt(){await slow.evaluate(()=>{let guard=0;while(window.lastUtterance&&guard++<100){const u=window.lastUtterance;window.lastUtterance=null;u.onend?.()}})}
  async function voice(text){await slow.evaluate(text=>mic.onresult({results:[Object.assign([{transcript:text}],{isFinal:true})]}),text)}
  async function approve(){await finishPrompt();await voice('doğru');await finishPrompt()}
  await slow.locator('#qa-start').click();await finishPrompt();
  await voice('Ali');assert.equal(await slow.locator('#qa-confirm').isVisible(),false);
  await voice('Veli');assert.equal(await slow.locator('#qa-confirm').isVisible(),false);
  await voice('tamam');assert.equal(await slow.locator('#qa-answer').inputValue(),'Ali Veli');await approve();
  await voice('bir sıfır sıfır sıfır sıfır');assert.equal(await slow.locator('#qa-confirm').isVisible(),false);
  await slow.evaluate(()=>mic.onend());assert.match(await slow.locator('#qa-status').textContent(),/korundu/);
  await slow.locator('#qa-listen').click();await voice('sıfır sıfır sıfır bir dört altı');assert.equal(await slow.locator('#qa-answer').inputValue(),'10000000146');await approve();
  await voice('beş ekim 200');await voice('tamam');assert.equal(await slow.locator('#qa-confirm').isVisible(),false);await finishPrompt();
  for(const text of ['beş','ekim','iki bin']){await voice(text);assert.equal(await slow.locator('#qa-confirm').isVisible(),false)}
  assert.match(await slow.locator('#qa-answer').inputValue(),/iki bin/);
  await voice('beş');assert.equal(await slow.locator('#qa-confirm').isVisible(),false);
  await voice('tamam');assert.equal(await slow.locator('#qa-answer').inputValue(),'05.10.2005');await approve();
  await voice('sıfır beş üç sekiz');assert.equal(await slow.locator('#qa-confirm').isVisible(),false);
  await voice('bir iki üç dört beş altı yedi');assert.equal(await slow.locator('#qa-answer').inputValue(),'05381234567');await approve();
  const suggested=await slow.locator('#qa-answer').inputValue();assert.match(suggested,/^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/);await voice('tamam');assert.match(await slow.locator('#qa-question').textContent(),/Son beyan/);await finishPrompt();
  await voice('Onam formunu okudum');assert.equal(await slow.locator('#qa-confirm').isVisible(),false);
  await voice('anladım onaylıyorum');assert.equal(await slow.locator('#qa-confirm').isVisible(),true);
  await finishPrompt();await voice('evet');assert.equal(await slow.locator('#qa-result').isVisible(),false);
  await finishPrompt();await voice('onaylamıyorum');assert.equal(await slow.locator('#qa-result').isVisible(),false);
  await finishPrompt();await voice('onaylıyorum');assert.equal(await slow.locator('#qa-result').isVisible(),true);assert.match(await slow.locator('#qa-summary').textContent(),/Onam formunu okudum, anladım, onaylıyorum/);
  await slow.locator('#qa-clear').click();checks++;
  console.log('PASS: mobile viewport, paused name, TC recovery, paused spoken October/year, phone chunks, suggested time and exact declaration safeguards');
  const guide=await pageWithMocks({welcome:true,mobile:true});
  assert.equal(await guide.locator('#welcome-dialog').isVisible(),true);
  assert.ok((await guide.evaluate(()=>spoken[0].text)).includes('Sesli başlat'));
  assert.equal(await guide.evaluate(()=>document.activeElement.id),'welcome-start');
  for(const width of [320,375,768,1280]){await guide.setViewportSize({width,height:812});assert.equal(await guide.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
  await guide.setViewportSize({width:375,height:812});
  await guide.screenshot({path:path.join(root,'../welcome-mobile.png')});
  await guide.locator('#welcome-start').click();assert.equal(await guide.locator('#welcome-dialog').isVisible(),false);
  assert.equal(await guide.locator('#guided-controls').isVisible(),true);
  await guide.evaluate(()=>{let guard=0;while(document.getElementById('guided-stage').textContent==='Kullanım açıklaması'&&window.lastUtterance&&guard++<100){const u=window.lastUtterance;window.lastUtterance=null;u.onend?.()}});
  assert.equal(await guide.evaluate(()=>document.activeElement.textContent),'1. İşlemin açıklaması');
  assert.equal(await guide.locator('#qa-work').isVisible(),false);
  await guide.locator('#guided-pause').click();assert.equal(await guide.evaluate(()=>speechSynthesis.paused),true);
  await guide.locator('#guided-resume').click();assert.equal(await guide.evaluate(()=>speechSynthesis.paused),false);
  const visited=await guide.evaluate(()=>{
   const seen=new Set();let guard=0;
   while(document.getElementById('qa-work').hidden&&window.lastUtterance&&guard++<200){
    seen.add(document.querySelector('.section.is-active').id);const u=window.lastUtterance;window.lastUtterance=null;u.onend?.();
   }
   return [...seen];
  });
  assert.deepEqual(visited,['section-0','section-1','section-2','section-3','section-4','section-5']);
  assert.equal(await guide.locator('#qa-work').isVisible(),true);assert.match(await guide.locator('#qa-question').textContent(),/Adınız/);
  assert.equal(await guide.locator('#guided-controls').isVisible(),false);
  const stopped=await pageWithMocks({welcome:true});await stopped.locator('#welcome-start').click();
  await stopped.evaluate(()=>window.beforeStop=lastUtterance);await stopped.locator('#guided-stop').click();await stopped.evaluate(()=>beforeStop.onend());
  assert.equal(await stopped.locator('#qa-work').isVisible(),false);assert.equal(await stopped.locator('#guided-controls').isVisible(),false);
  const escaped=await pageWithMocks({welcome:true});await escaped.keyboard.press('Escape');assert.equal(await escaped.locator('#welcome-dialog').isVisible(),false);assert.equal(await escaped.evaluate(()=>speechSynthesis.speaking),false);assert.equal(await escaped.evaluate(()=>window.onamSilent),true);
  checks++;console.log('PASS: initial accessible dialog, responsive layout, guided six-section reading/focus, pause/resume, automatic QA handoff, stop cancellation and Escape dismissal');
  const silent=await pageWithMocks({welcome:true,mobile:true});
  assert.equal(await silent.locator('#welcome-dialog button').count(),2);
  assert.equal(await silent.locator('#welcome-help,#interface-guide-toggle,#welcome-voice-guide').count(),0);
  await silent.locator('#welcome-dismiss').click();assert.equal(await silent.evaluate(()=>speechSynthesis.speaking),false);assert.equal(await silent.locator('#qa-auto').isChecked(),false);
  const quietCount=await silent.evaluate(()=>spoken.length);await silent.locator('#qa-start').click();await silent.locator('#qa-answer').fill('Sessiz Hasta');await silent.locator('#qa-submit').click();await silent.locator('#qa-confirm').click();assert.equal(await silent.evaluate(()=>spoken.length),quietCount);assert.equal(await silent.evaluate(()=>window.mic===undefined),true);
  assert.equal(await silent.locator('#qa-answer-label').textContent(),'T.C. kimlik numarası — cevabınız');
  assert.equal(await silent.locator('[aria-describedby]').evaluateAll(nodes=>nodes.every(el=>el.getAttribute('aria-describedby').split(/\s+/).every(id=>!!document.getElementById(id)))),true);
  const blocked=await pageWithMocks({welcome:true,mobile:true,autoplayBlocked:true});assert.equal(await blocked.locator('#welcome-dialog').isVisible(),true);assert.equal(await blocked.evaluate(()=>speechSynthesis.speaking),false);
  await blocked.locator('#welcome-start').click();assert.equal(await blocked.evaluate(()=>speechSynthesis.speaking),true);assert.equal(await blocked.evaluate(()=>window.onamSilent),false);assert.equal(await blocked.locator('#guided-controls').isVisible(),true);
  assert.ok((await blocked.evaluate(()=>spoken.at(-1).text)).includes('Sesli kullanım başladı'));
  await blocked.locator('#guided-stop').click();
  checks++;console.log('PASS: two large mobile choices, startup announcement attempt, blocked autoplay recovers on explicit start, silent QA has no audio/microphone, native screen-reader descriptions preserved');
  console.log(`${checks} check groups passed. Audio and recognition mocked; real device audio/network/microphone need manual validation.`);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
