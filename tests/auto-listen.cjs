const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const elements=new Map();const el=id=>{if(!elements.has(id))elements.set(id,{value:'',checked:true,disabled:false,focus(){},scrollIntoView(){},replaceChildren(){},removeAttribute(){}});return elements.get(id)};
const events={};let done,mic,starts=0;
const window={OnamValidation:{tc:v=>v==='10000000146'?v:null,birth:v=>v,phone:v=>v,dateTime:v=>v,localNow:()=> '24.10.2026 14:30',answerParts:(k,v)=>[v]},SpeechRecognition:class{start(){mic=this;starts++;this.onstart?.()}abort(){this.onend?.()}},addEventListener:(k,f)=>events[k]=f,onamAudio:{stop(){events['onam-stop']?.()},speak(message,callback){done=callback}},OnamRecords:{}};
const document={hidden:false,getElementById:el,addEventListener:(k,f)=>events[k]=f};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../qa.js'),'utf8'),{window,document,fetch:()=>Promise.resolve({ok:false}),crypto:{},setTimeout,clearTimeout});
const result=value=>mic.onresult({results:[Object.assign([{transcript:value}],{isFinal:true})]});
el('qa-start').onclick();assert.equal(starts,0);done();assert.equal(starts,1);
result('Deneme Kişi');assert.equal(el('qa-answer').value,'Deneme Kişi');assert.equal(starts,1);done();assert.equal(starts,2);
result('bilgilerim doğru');assert.match(el('qa-question').textContent,/T.C./);done();assert.equal(starts,3);
result('yanlış');done();assert.equal(starts,4); // invalid TC is read before retry
el('qa-answer').oninput();const old=done;old();assert.equal(starts,4);
el('qa-repeat').onclick();const stale=done;events['onam-stop']();stale();assert.equal(starts,4);
el('qa-repeat').onclick();done();assert.equal(starts,5);document.hidden=true;events.visibilitychange();assert.equal(el('qa-listen').disabled,false);
document.hidden=false;el('qa-auto').checked=false;el('qa-repeat').onclick();done();assert.equal(starts,5);
el('qa-auto').checked=true;el('qa-repeat').onclick();const beforeReset=done;el('qa-reset').onclick();beforeReset();assert.equal(starts,5);
console.log('PASS: automatic answer and confirmation, spoken progression, invalid-answer retry, typing, stop, hidden tab, opt-out, reset');

el('qa-start').onclick();done();mic.onresult({results:[Object.assign([{transcript:'Mobil Hasta'}],{isFinal:false})]});assert.equal(el('qa-answer').value,'Mobil Hasta');assert.equal(el('qa-confirm').hidden,true);mic.onend();assert.equal(el('qa-confirm').hidden,false);el('qa-reset').onclick();console.log('PASS: mobile interim preview and end-of-session readback');
