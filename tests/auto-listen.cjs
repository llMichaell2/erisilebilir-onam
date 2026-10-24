const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:true,disabled:false,focus(){},scrollIntoView(){},replaceChildren(){},removeAttribute(){}});return elements.get(id)};
const events={};let done,mic,starts=0;
const window={OnamValidation:{tc:v=>v==='10000000146'?v:null,birth:v=>v,phone:v=>v,dateTime:v=>v,localNow:()=> '24.10.2026 14:30',answerParts:(k,v)=>[v]},SpeechRecognition:class{start(){mic=this;starts++;this.onstart?.()}abort(){this.onend?.()}},addEventListener:(k,f)=>events[k]=f,onamAudio:{stop(){events['onam-stop']?.()},speak(message,callback){done=callback}},OnamRecords:{createKey:()=>'a'.repeat(64),submit:async report=>{window.lastReport=report;throw Error('Mock: no live save')}}};
const document={hidden:false,getElementById:el,addEventListener:(k,f)=>events[k]=f};
const sandbox={window,document,fetch:()=>Promise.resolve({ok:false}),crypto:{randomUUID:()=>'00000000-0000-4000-8000-000000000001'},setTimeout,clearTimeout};vm.createContext(sandbox);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../validation.js'),'utf8'),sandbox);window.OnamValidation=sandbox.OnamValidation;vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../qa.js'),'utf8'),sandbox);
const result=value=>mic.onresult({results:[Object.assign([{transcript:value}],{isFinal:true})]});
el('qa-start').onclick();assert.equal(starts,0);done();assert.equal(starts,1);
result('Deneme Kişi tamam');assert.equal(el('qa-answer').value,'Deneme Kişi');assert.equal(starts,1);done();assert.equal(starts,2);
result('bilgilerim doğru');assert.match(el('qa-question').textContent,/T.C./);done();assert.equal(starts,3);
result('yanlış tamam');done();assert.equal(starts,4); // invalid TC is read before retry
el('qa-answer').oninput();const old=done;old();assert.equal(starts,4);
el('qa-repeat').onclick();const stale=done;events['onam-stop']();stale();assert.equal(starts,4);
el('qa-repeat').onclick();done();assert.equal(starts,5);document.hidden=true;events.visibilitychange();assert.equal(el('qa-listen').disabled,false);
document.hidden=false;el('qa-auto').checked=false;el('qa-repeat').onclick();done();assert.equal(starts,5);
el('qa-auto').checked=true;el('qa-repeat').onclick();const beforeReset=done;el('qa-reset').onclick();beforeReset();assert.equal(starts,5);
console.log('PASS: automatic answer and confirmation, spoken progression, invalid-answer retry, typing, stop, hidden tab, opt-out, reset');

el('qa-start').onclick();done();mic.onresult({results:[Object.assign([{transcript:'Mobil Hasta'}],{isFinal:false})]});assert.equal(el('qa-answer').value,'Mobil Hasta');assert.equal(el('qa-confirm').hidden,true);mic.onend();assert.equal(el('qa-confirm').hidden,true);el('qa-listen').onclick();result('tamam');assert.equal(el('qa-confirm').hidden,false);el('qa-reset').onclick();console.log('PASS: mobile interim preview retained until explicit completion');

const final=value=>Object.assign([{transcript:value}],{isFinal:true});
el('qa-start').onclick();done();result('Yavaş Hasta tamam');el('qa-confirm').onclick();done();
assert.equal(mic.continuous,true);
const firstMic=mic;mic.onresult({results:[final('bir sıfır sıfır sıfır sıfır')]});
assert.equal(el('qa-confirm').hidden,true);assert.equal(mic,firstMic);assert.match(el('qa-status').textContent,/5 rakam/);
mic.onend();assert.match(el('qa-status').textContent,/korundu/);el('qa-listen').onclick();
assert.notEqual(mic,firstMic);mic.onresult({results:[final('sıfır sıfır sıfır bir dört altı')]});
assert.equal(el('qa-answer').value,'10000000146');assert.equal(el('qa-confirm').hidden,false);
el('qa-confirm').onclick();el('qa-answer').value='15.06.1990';el('qa-submit').onclick();el('qa-confirm').onclick();done();
assert.equal(mic.continuous,true);mic.onresult({results:[final('sıfır beş üç sekiz')]});assert.equal(el('qa-confirm').hidden,true);
mic.onresult({results:[final('sıfır beş üç sekiz'),final('bir iki üç dört beş altı yedi')]});
assert.equal(el('qa-confirm').hidden,false);assert.equal(el('qa-answer').value,'05381234567');
el('qa-reset').onclick();
console.log('PASS: slow TC digits across session end retained, phone chunks combined, full number required before readback');

el('qa-start').onclick();done();mic.onresult({results:[final('Yanlış İsim')]});assert.equal(el('qa-confirm').hidden,true);
mic.onresult({results:[final('Yanlış İsim'),final('baştan')]});assert.equal(el('qa-answer').value,'');
mic.onresult({results:[final('Yanlış İsim'),final('baştan'),final('Doğru İsim tamam')]});assert.equal(el('qa-answer').value,'Doğru İsim');
el('qa-reset').onclick();
el('qa-start').onclick();done();const failedMic=mic;failedMic.onerror({error:'network'});failedMic.onresult({results:[final('Geç Gelen tamam')]});assert.equal(el('qa-answer').value,'');
el('qa-reset').onclick();console.log('PASS: spoken restart clears earlier fragments; network error invalidates late results');
const goToDate=()=>{el('qa-start').onclick();for(const value of ['Deneme Hasta','10000000146','05.10.2005','05381234567']){el('qa-answer').value=value;el('qa-submit').onclick();el('qa-confirm').onclick()}done()};
goToDate();const nowValue=el('qa-answer').value;assert.equal(nowValue,sandbox.OnamValidation.dateTime(sandbox.OnamValidation.localNow()));result('tamam');assert.match(el('qa-question').textContent,/Son beyan/);el('qa-reset').onclick();
goToDate();result('yirmi dört ekim iki bin yirmi altı saat on dört dakika otuz tamam');assert.equal(el('qa-answer').value,'24.10.2026 14:30');assert.equal(el('qa-confirm').hidden,false);done();result('tamam');assert.match(el('qa-question').textContent,/Son beyan/);el('qa-reset').onclick();
console.log('PASS: current device time accepted with one tamam; spoken correction still requires readback confirmation');

for(const approval of ['beyanımı tamamla','onaylıyorum']){
 goToDate();result('tamam');done();result('Onam formunu okudum anladım onaylıyorum');done();
 result('onaylamıyorum');assert.equal(el('qa-result').hidden,true);done();
 result(approval);assert.equal(el('qa-result').hidden,false);assert.equal(el('qa-work').hidden,true);el('qa-reset').onclick();
}
console.log('PASS: final declaration ends with either spoken approval; negative approval does not finish');

for(const spoken of ['Okudum, anladım, onaylıyorum','Onan formunu okudum anladım onaylıyorum','  OKUDUM,ANLADIM,ONAYLIYORUM  ']){
 goToDate();result('tamam');done();result(spoken);assert.equal(el('qa-confirm').hidden,false);assert.equal(el('qa-answer').value,'Onam formunu okudum, anladım, onaylıyorum');done();result('onaylıyorum');assert.equal(el('qa-result').hidden,false);assert.equal(window.lastReport.answers.declaration.spokenDeclaration,spoken.trim());el('qa-reset').onclick();
}
for(const refused of ['Okudum anladım onaylamıyorum','Okudum anlamadım onaylıyorum','Onan formunu okudum anladım onaylamıyorum','Okudum anladım tamam']){
 goToDate();result('tamam');done();result(refused);assert.equal(el('qa-confirm').hidden,true);assert.equal(el('qa-result').hidden,true);el('qa-reset').onclick();
}
console.log('PASS: short declaration, onan spelling and punctuation variants accepted with full readback; negative/incomplete phrases rejected; original spoken declaration retained');
