const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
function setup(){
 const els=new Map(),events={},timers=new Map();let id=0,now=0,mic,done,starts=0;
 const el=k=>{if(!els.has(k))els.set(k,{value:'',checked:true,disabled:false,focus(){},replaceChildren(){},removeAttribute(){}});return els.get(k)};
 const window={OnamRecords:{},addEventListener:(k,f)=>events[k]=f,onamAudio:{stop(){events['onam-stop']?.()},speak(m,cb){window.lastSpoken=m;done=cb}},SpeechRecognition:class{start(){mic=this;starts++;this.onstart?.()}abort(){this.onend?.()}}};
 const document={hidden:false,getElementById:el,addEventListener:(k,f)=>events[k]=f};
 class Clock extends Date{static now(){return now}}
 const box={window,document,Date:Clock,fetch:async()=>({ok:false}),setTimeout:(f,ms)=>{timers.set(++id,{f,at:now+ms});return id},clearTimeout:k=>timers.delete(k)};
 vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(__dirname,'../validation.js'),'utf8'),box);window.OnamValidation=box.OnamValidation;
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../medical-history.js'),'utf8'),box);vm.runInContext(fs.readFileSync(path.join(__dirname,'../qa.js'),'utf8'),box);
 const tick=ms=>{now+=ms;for(const [key,t] of [...timers])if(t.at<=now){timers.delete(key);t.f()}};
 const send=(text,final=true,target=mic)=>target.onresult({results:[Object.assign([{transcript:text}],{isFinal:final})]});
 return {window,document,events,el,tick,send,get mic(){return mic},get starts(){return starts},start(){el('qa-start').onclick();done()},speakDone(){done()},click:k=>el('qa-'+k).onclick()};
}
{
 const x=setup();x.start();x.send('Öykü');const old=x.mic;old.onend();old.onend();x.send('Geç gelen yanlış tamam',true,old);assert.equal(x.el('qa-answer').value,'Öykü');x.tick(600);assert.equal(x.starts,2);x.send('Işıl Çığ Şener. Tamam.');assert.equal(x.el('qa-answer').value,'Öykü Işıl Çığ Şener');assert.equal(x.el('qa-confirm').hidden,false);x.tick(1000);assert.equal(x.starts,2);
 console.log('PASS: paused Turkish multi-part name survives service disconnect; punctuation cleaned; duplicate end/late callbacks ignored');
}
for(const name of ['Ali Can','A B','Ayşe-Nur Çığ','D’Arcy Şener']){
 const x=setup();x.start();x.send(name+' tamam');assert.equal(x.el('qa-answer').value,name);assert.equal(x.el('qa-confirm').hidden,false);
}
for(const name of ['Ali','Ali 123','Ali - Yılmaz']){
 const x=setup();x.start();x.send(name+' tamam');assert.equal(x.el('qa-confirm').hidden,true);
}
console.log('PASS: Turkish, hyphenated and apostrophe names accepted; single names/numbers rejected');
for(const action of ['stop','reset','type','hidden','opt-out','silent','repeat','manual']){
 const x=setup();x.start();x.send('Ayşe');x.mic.onend();const before=x.starts;
 if(action==='stop'){assert.equal(x.window.onamMicActive(),true);x.events['onam-stop']();assert.equal(x.window.onamMicActive(),false);assert.match(x.el('qa-status').textContent,/durduruldu/)}
 if(action==='reset')x.click('reset');
 if(action==='type'){x.el('qa-answer').value='Yazılan İsim';x.el('qa-answer').oninput()}
 if(action==='hidden'){x.document.hidden=true;x.events.visibilitychange()}
 if(action==='opt-out'){x.el('qa-auto').checked=false;x.el('qa-auto').onchange()}
 if(action==='silent')x.window.onamSilent=true;
 if(action==='repeat')x.click('repeat');
 if(action==='manual')x.click('listen');
 x.tick(600);assert.equal(x.starts,before+(action==='manual'?1:0),action);
}
console.log('PASS: pending recovery cancelled by stop/reset/typing/hidden tab/opt-out/silent mode/repeat/manual restart');
{
 const x=setup();x.start();x.el('qa-answer').value='Ayşe';x.el('qa-answer').oninput();x.click('listen');x.send('Yılmaz tamam');assert.equal(x.el('qa-answer').value,'Ayşe Yılmaz');
 console.log('PASS: typed name retained when continuing by microphone');
}
{
 const x=setup();x.start();x.send('Ali Can tamam');x.speakDone();x.send('evet',false);x.mic.onend();assert.match(x.el('qa-question').textContent,/Adınız/);x.tick(600);x.send('hayır');assert.equal(x.el('qa-confirm').hidden,true);assert.match(x.el('qa-question').textContent,/Adınız/);
 console.log('PASS: provisional yes never confirms on disconnect; final no permits correction');
}
{
 const x=setup();x.start();for(let i=0;i<7;i++){x.mic.onerror({error:'no-speech'});x.mic.onend();x.tick(600)}assert.equal(x.starts,7);assert.match(x.el('qa-status').textContent,/Mikrofon düğmesi/);
 const y=setup();y.start();y.mic.onend();y.tick(240000);assert.equal(y.starts,1);assert.match(y.el('qa-status').textContent,/süresi doldu/);
 console.log('PASS: silence recovery bounded to six retries and original session deadline');
}
for(const error of ['not-allowed','service-not-allowed','audio-capture','aborted']){
 const x=setup();x.start();x.send('Ayşe');x.mic.onerror({error});x.mic.onend();x.tick(1000);assert.equal(x.starts,1,error);assert.equal(x.el('qa-answer').value,'Ayşe');
}
console.log('PASS: permission/device errors stop recovery and preserve text');

{
 const x=setup();x.start();x.send('Ali Veli tamam',false);x.mic.onend();assert.equal(x.el('qa-confirm').hidden,true);assert.equal(x.el('qa-answer').value,'Ali Veli');x.tick(600);x.send('tamam');assert.equal(x.el('qa-answer').value,'Ali Veli');assert.equal(x.el('qa-confirm').hidden,false);
 console.log('PASS: provisional completion waits for final confirmation and does not become part of the name');
}

{
 const x=setup();x.start();x.send('Ayşe');const stale=x.mic;x.mic.onerror({error:'network'});stale.onend();x.send('Yanlış Geç Sonuç tamam',true,stale);assert.equal(x.el('qa-answer').value,'Ayşe');x.tick(1799);assert.equal(x.starts,1);x.tick(1);assert.equal(x.starts,2);x.send('Yılmaz tamam');assert.equal(x.el('qa-answer').value,'Ayşe Yılmaz');assert.equal(x.el('qa-confirm').hidden,false);
 console.log('PASS: one network retry preserves partial answer and rejects late callbacks');
}
{
 const x=setup();x.start();x.mic.onerror({error:'network'});x.tick(1800);assert.equal(x.starts,2);x.mic.onerror({error:'network'});x.mic.onend();x.tick(60000);x.speakDone();assert.equal(x.starts,2);assert.match(x.el('qa-status').textContent,/Yazıyla devam et/);assert.equal(x.el('qa-type').hidden,false);
 x.click('type');assert.equal(x.el('qa-auto').checked,false);assert.equal(x.el('qa-answer').hidden,false);
 console.log('PASS: repeated network failures stop after one retry; typing remains available and no automatic microphone loop');
}
for(const action of ['stop','reset','type','hidden','opt-out','silent','repeat','manual']){
 const x=setup();x.start();x.mic.onerror({error:'network'});const before=x.starts;
 if(action==='stop')x.events['onam-stop']();
 if(action==='reset')x.click('reset');
 if(action==='type')x.click('type');
 if(action==='hidden'){x.document.hidden=true;x.events.visibilitychange()}
 if(action==='opt-out'){x.el('qa-auto').checked=false;x.el('qa-auto').onchange()}
 if(action==='silent')x.window.onamSilent=true;
 if(action==='repeat')x.click('repeat');
 if(action==='manual')x.click('listen');
 x.tick(1800);assert.equal(x.starts,before+(action==='manual'?1:0),action);
}
{
 const x=setup();x.start();x.send('Ali Can tamam');x.speakDone();x.send('evet',false);x.mic.onerror({error:'network'});x.tick(1800);assert.match(x.el('qa-question').textContent,/Adınız/);assert.equal(x.el('qa-confirm').hidden,false);x.send('doğru');assert.match(x.el('qa-question').textContent,/T.C./);
}
{
 const x=setup();x.start();x.window.navigator={onLine:false};x.mic.onerror({error:'network'});x.tick(1800);assert.equal(x.starts,1);assert.match(x.el('qa-status').textContent,/çevrimdışı/);
}
{
 const x=setup();x.start();for(const v of ['Test Hasta','10000000146','05.10.2005','05381234567']){x.el('qa-answer').value=v;x.click('submit');x.click('confirm')}x.speakDone();x.mic.onerror({error:'network'});x.tick(1800);x.mic.onerror({error:'network'});assert.equal(x.el('qa-answer').hidden,false);x.click('type');x.el('qa-answer').value='Bilmiyorum';x.click('submit');assert.equal(x.el('qa-answer').value,'Bilmiyorum');x.click('confirm');assert.match(x.el('qa-question').textContent,/Sağlık öyküsü 2/);assert.equal(x.el('qa-auto').checked,false);
}
console.log('PASS: network recovery honours cancellation, offline state, confirmation safety and typed unknown health answers');

{
 const x=setup();x.start();x.tick(120001);assert.equal(x.window.onamMicActive(),true);x.tick(119999);assert.equal(x.window.onamMicActive(),false);
 const y=setup();y.start();y.send('Ali Can tamam');y.speakDone();y.tick(25001);assert.equal(y.window.onamMicActive(),true);y.tick(19999);assert.equal(y.window.onamMicActive(),false);
}
{
 const x=setup();x.start();for(const value of ['Test Hasta','10000000146','05.10.2005','05381234567']){x.el('qa-answer').value=value;x.click('submit');x.click('confirm')}
 assert.match(x.window.lastSpoken,/Sağlık sorularına evet/);x.click('repeat');assert.doesNotMatch(x.window.lastSpoken,/Sağlık sorularına evet/);
 x.click('no');x.click('confirm');assert.doesNotMatch(x.window.lastSpoken,/Sağlık sorularına evet|Bilmiyorsanız bilmiyorum/);x.click('correct');assert.doesNotMatch(x.window.lastSpoken,/Sağlık sorularına evet/);
 x.click('reset');x.start();for(const value of ['Test Hasta','10000000146','05.10.2005','05381234567']){x.el('qa-answer').value=value;x.click('submit');x.click('confirm')}assert.match(x.window.lastSpoken,/Sağlık sorularına evet/);
}
console.log('PASS: 240-second answers, 45-second confirmations and once-per-form health instructions; repeat does not repeat instructions');

const reachHealth=()=>{const x=setup();x.start();for(const value of ['Test Hasta','10000000146','05.10.2005','05381234567']){x.el('qa-answer').value=value;x.click('submit');x.click('confirm')}return x};
{
 const x=reachHealth();x.click('yes');x.speakDone();x.tick(5999);assert.equal(x.el('qa-confirm').hidden,false);x.tick(1);assert.match(x.el('qa-question').textContent,/Açıklama/);
 const y=reachHealth();y.click('no');y.speakDone();y.tick(6000);assert.match(y.el('qa-question').textContent,/Sağlık öyküsü 2/);
}
for(const correction of ['hayır','yanlış']){
 const x=reachHealth();x.click('yes');x.speakDone();x.tick(3000);x.send(correction);assert.match(x.el('qa-question').textContent,/Sağlık öyküsü 1/);assert.equal(x.el('qa-confirm').hidden,true);x.tick(7000);assert.match(x.el('qa-question').textContent,/Sağlık öyküsü 1/);
}
for(const action of ['speech','interim','network','stop','hidden','opt-out']){
 const x=reachHealth();x.click('yes');x.speakDone();
 if(action==='speech')x.mic.onspeechstart();
 if(action==='interim')x.send('yan',false);
 if(action==='network')x.mic.onerror({error:'network'});
 if(action==='stop')x.events['onam-stop']();
 if(action==='hidden'){x.document.hidden=true;x.events.visibilitychange()}
 if(action==='opt-out'){x.el('qa-auto').checked=false;x.el('qa-auto').onchange()}
 x.tick(6000);assert.equal(x.el('qa-confirm').hidden,false,action);assert.match(x.el('qa-question').textContent,/Sağlık öyküsü 1/);
}
{
 const x=setup();x.start();x.send('Ali Can tamam');x.speakDone();x.tick(10000);assert.match(x.el('qa-question').textContent,/Adınız/);
 const y=reachHealth();for(let i=0;i<10;i++){y.click('no');y.click('confirm')}assert.match(y.el('qa-question').textContent,/Son beyan/);y.el('qa-answer').value='Okudum anladım onaylıyorum';y.click('submit');y.speakDone();y.tick(10000);assert.equal(y.el('qa-confirm').hidden,false);assert.match(y.el('qa-question').textContent,/Son beyan/);
}
console.log('PASS: health-only automatic progression after readback and six seconds of live correction listening; speech/errors/stop cancel; final declaration never automatic');
