const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
function setup(){
 const elements=new Map(),events={},timers=new Map();let nextTimer=0,done,mic,starts=0,aborts=0;
 const el=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:true,disabled:false,focus(){},scrollIntoView(){},replaceChildren(){},removeAttribute(){}});return elements.get(id)};
 const window={OnamValidation:{tc:v=>v==='10000000146'?v:null,birth:v=>v,phone:v=>v,dateTime:v=>v,localNow:()=> '24.10.2026 14:30',answerParts:(k,v)=>[v]},SpeechRecognition:class{start(){mic=this;starts++;this.onstart?.()}abort(){aborts++;this.onend?.()}},addEventListener:(k,f)=>events[k]=f,onamAudio:{stop(){events['onam-stop']?.()},speak(message,callback){done=callback}},OnamRecords:{}};
 const document={hidden:false,getElementById:el,addEventListener:(k,f)=>events[k]=f};
 vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../qa.js'),'utf8'),{window,document,fetch:()=>Promise.resolve({ok:false}),crypto:{},setTimeout:(f,ms)=>{timers.set(++nextTimer,{f,ms});return nextTimer},clearTimeout:id=>timers.delete(id)});
 let history=[];
 return {el,events,document,timers,get mic(){return mic},get starts(){return starts},get aborts(){return aborts},done:()=>done(),start(){el('qa-start').onclick()},result(value,{speech=true,final=true}={}){if(speech)mic.onspeechstart();const item=Object.assign([{transcript:value}],{isFinal:final});history.push(item);mic.onresult({results:history})},tick(ms){for(const [id,t] of [...timers])if(t.ms===ms){timers.delete(id);history=[];t.f()}}};
}
{
 const h=setup();h.start();assert.equal(h.starts,1);assert.equal(h.mic.continuous,true);
 h.result('Adınız ve soyadınız nedir?');assert.equal(h.el('qa-answer').value,'');
 h.done();h.result('Deneme Kişi');assert.equal(h.el('qa-answer').value,'Deneme Kişi');assert.equal(h.el('qa-confirm').hidden,false);
 assert.equal(h.starts,1);assert.equal(h.aborts,0);
 // Echo starts during readback, but the final result arrives after playback ends.
 h.mic.onspeechstart();h.done();h.result('bilgilerim doğru',{speech:false});assert.match(h.el('qa-question').textContent,/Adınız/);
 h.result('bilgilerim doğru');assert.match(h.el('qa-question').textContent,/kimlik/);assert.equal(h.starts,1);assert.equal(h.aborts,0);
 h.done();h.result('10000000146');h.done();h.result('yanlış');assert.match(h.el('qa-question').textContent,/kimlik/);assert.equal(h.el('qa-answer').value,'');
 h.done();h.result('10000000146');h.done();h.result('doğru');assert.match(h.el('qa-question').textContent,/Doğum/);
 h.el('qa-reset').onclick();assert.equal(h.aborts,1);
 console.log('PASS: one continuous microphone session across answers, readbacks, voice confirmation and correction; echo and delayed echo rejected');
}
{
 const h=setup();h.start();h.done();h.result('Mobil Hasta',{final:false});assert.equal(h.el('qa-answer').value,'Mobil Hasta');assert.equal(h.el('qa-confirm').hidden,true);h.mic.onend();assert.equal(h.el('qa-confirm').hidden,false);h.tick(300);assert.equal(h.starts,2);h.el('qa-reset').onclick();
 console.log('PASS: interim-only mobile result read back on session end, then bounded session recovery');
}
for(const action of ['stop','typing','hidden','optout','timeout']){
 const h=setup();h.start();h.done();const old=h.mic;
 if(action==='stop')h.events['onam-stop']();
 if(action==='typing')h.el('qa-answer').oninput();
 if(action==='hidden'){h.document.hidden=true;h.events.visibilitychange()}
 if(action==='optout'){h.el('qa-auto').checked=false;h.el('qa-auto').onchange()}
 if(action==='timeout')h.tick(25000);
 const starts=h.starts;old.onspeechstart();old.onresult({results:[Object.assign([{transcript:'Geç Gelen'}],{isFinal:true})]});h.tick(300);assert.equal(h.starts,starts);assert.equal(h.el('qa-answer').value,'');assert.equal(h.aborts,1);
}
{
 const h=setup();h.el('qa-auto').checked=false;h.start();assert.equal(h.starts,0);h.el('qa-listen').onclick();h.result('Manuel Hasta');assert.equal(h.el('qa-confirm').hidden,false);assert.equal(h.aborts,1);h.done();assert.equal(h.starts,1);
}
{
 const h=setup();h.start();h.done();h.mic.onerror({error:'not-allowed'});h.tick(300);assert.equal(h.starts,1);assert.match(h.el('qa-status').textContent,/izni/);
}
console.log('PASS: stop, typing, hidden tab, opt-out, timeout, stale callbacks, manual mode and permission failure');

{const h=setup();h.start();h.done();for(let i=0;i<3;i++){h.mic.onend();h.tick(300)}assert.equal(h.starts,3);assert.match(h.el("qa-status").textContent,/sona erdi/);console.log("PASS: session restart limit")}
