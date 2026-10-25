const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
function setup(){
 const els=new Map(),events={},timers=new Map();let id=0,now=0,mic,done,starts=0;
 const el=k=>{if(!els.has(k))els.set(k,{value:'',checked:true,disabled:false,focus(){},replaceChildren(){},removeAttribute(){}});return els.get(k)};
 const window={OnamRecords:{},addEventListener:(k,f)=>events[k]=f,onamAudio:{stop(){events['onam-stop']?.()},speak(m,cb){done=cb}},SpeechRecognition:class{start(){mic=this;starts++;this.onstart?.()}abort(){this.onend?.()}}};
 const document={hidden:false,getElementById:el,addEventListener:(k,f)=>events[k]=f};
 class Clock extends Date{static now(){return now}}
 const box={window,document,Date:Clock,fetch:async()=>({ok:false}),setTimeout:(f,ms)=>{timers.set(++id,{f,at:now+ms});return id},clearTimeout:k=>timers.delete(k)};
 vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(__dirname,'../validation.js'),'utf8'),box);window.OnamValidation=box.OnamValidation;
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../qa.js'),'utf8'),box);
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
 const x=setup();x.start();for(let i=0;i<4;i++){x.mic.onerror({error:'no-speech'});x.mic.onend();x.tick(600)}assert.equal(x.starts,4);assert.match(x.el('qa-status').textContent,/Mikrofon düğmesi/);
 const y=setup();y.start();y.mic.onend();y.tick(120000);assert.equal(y.starts,1);assert.match(y.el('qa-status').textContent,/süresi doldu/);
 console.log('PASS: silence recovery bounded to three retries and original session deadline');
}
for(const error of ['network','not-allowed','service-not-allowed','audio-capture','aborted']){
 const x=setup();x.start();x.send('Ayşe');x.mic.onerror({error});x.mic.onend();x.tick(1000);assert.equal(x.starts,1,error);assert.equal(x.el('qa-answer').value,'Ayşe');
}
console.log('PASS: permission/network/device errors stop recovery and preserve text');

{
 const x=setup();x.start();x.send('Ali Veli tamam',false);x.mic.onend();assert.equal(x.el('qa-confirm').hidden,true);assert.equal(x.el('qa-answer').value,'Ali Veli');x.tick(600);x.send('tamam');assert.equal(x.el('qa-answer').value,'Ali Veli');assert.equal(x.el('qa-confirm').hidden,false);
 console.log('PASS: provisional completion waits for final confirmation and does not become part of the name');
}
