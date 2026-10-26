
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
function setup(){
 const nodes=new Map(),events={},timers=new Map();let mic,done,saved=null,id=0;
 const el=k=>{if(!nodes.has(k))nodes.set(k,{value:'',checked:true,hidden:false,textContent:'',disabled:false,focus(){},replaceChildren(){},removeAttribute(){},scrollIntoView(){}});return nodes.get(k)};
 const window={SpeechRecognition:class{start(){mic=this;this.onstart?.()}abort(){this.onend?.()}},onamAudio:{stop(){events['onam-stop']?.()},speak(message,callback){done=callback}},onamFormSnapshot:[{title:'Bilgilendirme',text:'Test metni'}],OnamRecords:{configured:false,createKey:()=>'a'.repeat(64),submit:async report=>{saved=structuredClone(report);throw Error('Mock: no live save')}},addEventListener:(k,f)=>events[k]=f};
 const box={window,document:{hidden:false,getElementById:el,addEventListener:(k,f)=>events[k]=f},fetch:async()=>({ok:false}),TextEncoder,crypto:{randomUUID:()=>'00000000-0000-4000-8000-000000000001'},setTimeout:f=>{timers.set(++id,f);return id},clearTimeout:k=>timers.delete(k)};
 vm.createContext(box);for(const file of ['medical-history.js','validation.js'])vm.runInContext(fs.readFileSync(root+'/'+file,'utf8'),box);window.OnamValidation=box.OnamValidation;vm.runInContext(fs.readFileSync(root+'/qa.js','utf8'),box); // validation attaches to window in browsers
 const raw=value=>mic.onresult({results:[Object.assign([{transcript:value}],{isFinal:true})]});
 return{el,window,events,get saved(){return saved},done:()=>done?.(),raw,click:key=>el('qa-'+key).onclick(),type:value=>{el('qa-answer').value=value;el('qa-submit').onclick()},begin(){el('qa-start').onclick();for(const value of ['Test Hasta','10000000146','05.10.2005','05381234567']){el('qa-answer').value=value;el('qa-submit').onclick();el('qa-confirm').onclick()}}};
}

module.exports=(async()=>{
 const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve()};
 async function finish(mode){
  const f=setup(),messages=[];const original=f.window.onamAudio.speak;f.window.onamAudio.speak=(text,callback)=>{messages.push(text);original(text,callback)};
  let accept,reject;f.window.OnamRecords.submit=()=>new Promise((resolve,no)=>{accept=resolve;reject=no});f.window.OnamRecords.recordUrl=()=>'https://onam.test/record.html#key='+'a'.repeat(64);f.window.OnamQR={render(){if(mode==='qr-error')throw Error('QR error')}};
  f.begin();for(let i=0;i<10;i++){f.click('no');f.click('confirm')}f.type('Okudum anladım onaylıyorum');f.click('confirm');
  assert.ok(!messages.some(text=>text.includes('Barkodunuz oluşturuldu')));
  if(mode==='clear'){f.click('clear');accept('00000000-0000-4000-8000-000000000001')}else if(mode==='failure')reject(Error('Mock network failure'));else accept('00000000-0000-4000-8000-000000000001');
  await flush();
  if(mode==='success'){assert.equal(messages.filter(text=>text.includes('Barkodunuz oluşturuldu')).length,1);assert.equal(f.el('qa-receipt').hidden,false)}
  else assert.equal(messages.filter(text=>text.includes('Barkodunuz oluşturuldu')).length,0);
  if(mode==='qr-error')assert.ok(messages.some(text=>text.includes('kaydedildi ancak barkod')));
 }
 for(const mode of ['success','failure','clear','qr-error'])await finish(mode);
 console.log('PASS: QR creation announced only after successful save and render; failures and cleared forms never announce false success');
})();
