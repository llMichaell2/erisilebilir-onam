
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
 for(const mode of ['Hayır','Bilmiyorum','Evet']){
  const f=setup();f.begin();assert.match(f.el('qa-question').textContent,/Sağlık öyküsü 1 \/ 10/);
  for(let i=0;i<10;i++){
   assert.match(f.el('qa-question').textContent,new RegExp('Sağlık öyküsü '+(i+1)+' / 10'));
   assert.equal(f.el('qa-yes').hidden,false);assert.equal(f.el('qa-no').hidden,false);
   if(mode==='Bilmiyorum'){f.done();f.raw('bilmiyorum');assert.equal(f.el('qa-answer').value,'Bilmiyorum')}else f.click(mode==='Evet'?'yes':'no');
   assert.equal(f.el('qa-confirm').hidden,false);f.click('confirm');
   if(mode==='Evet'&&i<9){
    assert.match(f.el('qa-question').textContent,/Açıklama/);f.type('');assert.equal(f.el('qa-confirm').hidden,true);
    f.type('Test açıklaması');assert.equal(f.el('qa-confirm').hidden,false);f.click('confirm');
   }
  }
  assert.match(f.el('qa-question').textContent,/Son beyan/);
  f.type('Okudum anladım onaylıyorum');f.click('confirm');
  assert.ok(f.saved);assert.equal(Object.keys(f.saved.answers).length,6);
  const history=f.saved.answers.declaration.healthHistory;assert.equal(history.version,'health-history-v1');assert.equal(history.items.length,10);
  assert.ok(history.items.every(item=>item.answer===mode));if(mode==='Evet')assert.equal(history.items.filter(item=>item.detail).length,9);else assert.equal(history.items.filter(item=>item.detail).length,0);
  assert.ok(new TextEncoder().encode(JSON.stringify(f.saved.answers,null,1)).length<6000);
  f.click('clear');assert.equal(f.el('qa-summary').textContent,'');assert.equal(f.el('qa-result').hidden,true);
 }
 const f=setup();f.begin();f.done();f.raw('evet hayır');assert.equal(f.el('qa-confirm').hidden,true);f.done();f.raw('evet evet');assert.equal(f.el('qa-answer').value,'Evet');f.click('correct');f.click('no');f.click('confirm');assert.match(f.el('qa-question').textContent,/Sağlık öyküsü 2/);
 f.click('date-edit');f.type('25.10.2026 14:30');f.click('confirm');assert.match(f.el('qa-question').textContent,/Sağlık öyküsü 2/);
 f.done();f.raw('evet');f.click('confirm');f.done();f.raw('bilmiyorum');assert.equal(f.el('qa-answer').value,'bilmiyorum');f.click('confirm');assert.match(f.el('qa-question').textContent,/Sağlık öyküsü 3/);
 assert.equal(f.saved,null);f.click('reset');assert.equal(f.el('qa-result').hidden,true);
 const H=f.window.OnamHealth;assert.equal(H.parseAnswer('bilmiyorum'),'Bilmiyorum');assert.equal(H.parseAnswer('hayır hayır'),'Hayır');assert.equal(H.parseAnswer('emin değilim'),'');assert.throws(()=>H.snapshot({}));assert.deepEqual(JSON.parse(JSON.stringify(H.entries(null))),[]);
 const complete=Object.fromEntries(H.definitions.flatMap(q=>[['history_'+q.id,{value:'Evet'}],['detail_'+q.id,{value:'ğ'.repeat(90)}]]));const snap=H.snapshot(complete);assert.equal(snap.items.length,10);assert.ok(H.detailError('ğ'.repeat(91)));assert.equal(H.entries({version:'unknown',items:[]}),null);
 console.log('PASS: all ten Yes/No/Unknown paths, nine conditional details, confirmation and correction, no premature submission, resumed date editing, mixed answers rejected, six-field API compatibility, reset and payload limits.');
})();
