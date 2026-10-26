
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),admin=fs.readFileSync(root+'/admin.js','utf8'),records=fs.readFileSync(root+'/records.js','utf8');
const error=(status,code)=>Object.assign(Error('simulated service failure'),{status,code});
const settle=async()=>{for(let i=0;i<70;i++)await Promise.resolve()};
function fixture(options={}){
 const nodes=new Map(),events={},intervals=new Map();let count=0,logins=0,logouts=0,renewals=0,reads=0,listMode=options.listMode||'ok',refreshMode=options.refreshMode||'ok',delayed=null;
 function node(){return {hidden:false,disabled:false,checked:false,value:'',textContent:'',children:[],dataset:{},attributes:{},focus(){},append(...items){this.children.push(...items)},replaceChildren(...items){this.children=items},setAttribute(k,v){this.attributes[k]=v},addEventListener(){},showModal(){this.open=true},close(){this.open=false},querySelectorAll(){return []}}}
 const el=id=>{if(!nodes.has(id))nodes.set(id,node());return nodes.get(id)};
 el('dashboard').hidden=true;el('portal-home').hidden=true;
 const record={id:'00000000-0000-4000-8000-000000000001',patient_name:'TEST HASTA',created_at:new Date().toISOString()};
 const api={configured:true,isKey:()=>false,login:async()=>{logins++;return{access_token:'token',refresh_token:'refresh',expires_at:options.expired?1:Date.now()/1000+3600}},
 refreshSession:async()=>{renewals++;if(refreshMode!=='ok')throw error(refreshMode,refreshMode===400?'refresh_token_not_found':undefined);return{access_token:'renewed',refresh_token:'rotated',expires_at:Date.now()/1000+3600}},
 logout:async()=>{logouts++},
 listAuthenticated:async token=>{reads++;if(listMode==='delay')return new Promise(resolve=>delayed=resolve);if(listMode==='once401'&&token==='token')throw error(401);if(listMode!=='ok'&&listMode!=='once401')throw error(listMode);return{records:[record],active_count:1,archived_count:0,archive_enabled:true}}};
 const window={OnamRecords:api,addEventListener:(k,f)=>events[k]=f};
 const document={hidden:false,getElementById:el,createElement:node,createTextNode:t=>({textContent:t}),addEventListener:(k,f)=>events[k]=f,querySelectorAll:()=>[]};
 vm.runInNewContext(admin,{window,document,Date,URL,setInterval:f=>{intervals.set(++count,f);return count},clearInterval:id=>intervals.delete(id)});
 return{el,events,api,async login(){el('email').value='staff@example.test';el('password').value='test-only';el('login-form').onsubmit({preventDefault(){}});await settle()},async update(){await el('refresh').onclick();await settle()},set list(value){listMode=value},set renewal(value){refreshMode=value},get logins(){return logins},get logouts(){return logouts},get renewals(){return renewals},get reads(){return reads},get intervals(){return intervals.size},resolve(){delayed({records:[record],active_count:1,archive_enabled:true})}};
}
module.exports=(async()=>{
 let f=fixture();await f.login();assert.equal(f.el('dashboard').hidden,false);f.el('select-all').checked=true;f.el('select-all').onchange();assert.equal(f.el('archive-selected').disabled,false);
 for(const mode of [0,503,429]){f.list=mode;await f.update();assert.equal(f.el('dashboard').hidden,false);assert.equal(f.el('login').hidden,true);assert.equal(f.el('record-list').children.length,1);assert.equal(f.el('archive-selected').disabled,true);assert.equal(f.logouts,0);assert.equal(f.logins,1)}
 f.list='ok';await f.update();assert.equal(f.el('archive-selected').disabled,false);assert.match(f.el('status').textContent,/Kayıtlar güncel/);
 f=fixture({listMode:503});await f.login();assert.equal(f.el('dashboard').hidden,false);assert.equal(f.logouts,0);assert.equal(f.intervals,1);f.list='ok';await f.update();assert.equal(f.logins,1);
 f=fixture({listMode:'once401'});await f.login();assert.equal(f.renewals,1);assert.equal(f.reads,2);assert.equal(f.logouts,0);assert.equal(f.el('dashboard').hidden,false);
 f=fixture({listMode:401});await f.login();assert.equal(f.renewals,1);assert.equal(f.el('dashboard').hidden,true);assert.equal(f.el('record-list').children.length,0);assert.equal(f.logouts,1);
 f=fixture({expired:true,refreshMode:503});await f.login();assert.equal(f.logouts,0);assert.equal(f.el('dashboard').hidden,false);f.renewal='ok';await f.update();assert.equal(f.renewals,2);assert.equal(f.el('login').hidden,true);
 for(const config of [{expired:true,refreshMode:400},{listMode:403}]){f=fixture(config);await f.login();assert.equal(f.el('login').hidden,false);assert.equal(f.logouts,1);assert.equal(f.intervals,0)}
 f=fixture();await f.login();f.list='delay';const pending=f.update();await settle();await f.el('logout').onclick();f.resolve();await pending;assert.equal(f.el('dashboard').hidden,true);assert.equal(f.el('record-list').children.length,0);
 let reply={access_token:'a',refresh_token:'r',expires_in:600},responseStatus=200;
 const w={ONAM_CONFIG:{supabaseUrl:'https://mock.test',supabaseKey:'public-test'}};
 vm.runInNewContext(records,{window:w,document:{currentScript:{src:'https://onam.test/records.js'}},URL,Date,AbortSignal,fetch:async()=>({ok:responseStatus===200,status:responseStatus,json:async()=>reply})});
 const before=Date.now()/1000;const signed=await w.OnamRecords.login('staff@example.test','test-only');assert.ok(signed.expires_at>=before+599&&signed.expires_at<=before+601);
 const renewed=await w.OnamRecords.refreshSession('r');assert.ok(renewed.expires_at>=before+599);
 reply=null;await assert.rejects(w.OnamRecords.listAuthenticated('a'),e=>e.status===403);reply={records:null};await assert.rejects(w.OnamRecords.listAuthenticated('a'),e=>e.status===502);
 reply={code:'refresh_token_not_found'};responseStatus=400;await assert.rejects(w.OnamRecords.refreshSession('r'),e=>e.code==='refresh_token_not_found'&&e.status===400);
 console.log('PASS: offline/503/429 retain session and cache, stale mutations disabled, recovery without login, initial fetch recovery, one 401 refresh/retry, true revocation clears records, refresh expiry metadata, role loss, stale logout responses.');
})();
