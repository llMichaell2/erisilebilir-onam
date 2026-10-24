const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {spawnSync}=require('node:child_process');const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
(async()=>{
 const work=fs.mkdtempSync(path.join(os.tmpdir(),'onam-audio-test-'));
 try{
  fs.mkdirSync(path.join(work,'tools'));for(const f of ['index.html','qa.js','speech-text.js','voice-messages.json','tools/generate-audio.mjs','tools/edge-voice.py'])fs.copyFileSync(path.join(root,f),path.join(work,f));
  fs.writeFileSync(path.join(work,'mock.cjs'),`global.fetch=async(url,opts)=>{const body=JSON.parse(opts.body);if(url!=='https://api.openai.com/v1/audio/speech'||body.model!=='gpt-4o-mini-tts'||body.input.includes('10000000146'))throw Error('Invalid request');return new Response(new Uint8Array(200),{headers:{'content-type':'audio/mpeg'}})};`);
  const run=()=>spawnSync(process.execPath,['--require',path.join(work,'mock.cjs'),'tools/generate-audio.mjs','--provider=openai'],{cwd:work,env:{...process.env,TTS_API_KEY:'test-only-placeholder'},encoding:'utf8'});
  let result=run();assert.equal(result.status,0,result.stderr);
  let manifest=JSON.parse(fs.readFileSync(path.join(work,'audio/manifest.json')));assert.ok(Object.keys(manifest.clips).length>12);
  // Cached generation must not need another provider request.
  fs.writeFileSync(path.join(work,'mock.cjs'),`global.fetch=()=>{throw Error('Unexpected provider request')}`);
  result=run();assert.equal(result.status,0,result.stderr);
  // Failed generation preserves the previous complete manifest.
  fs.unlinkSync(path.join(work,Object.values(manifest.clips)[0]));
  const before=fs.readFileSync(path.join(work,'audio/manifest.json'),'utf8');
  result=run();assert.notEqual(result.status,0);assert.equal(fs.readFileSync(path.join(work,'audio/manifest.json'),'utf8'),before);
  console.log('PASS: public-message audio generation contract, public clips, cache reuse, failure preserves manifest (provider mocked)');
  const fakePython=path.join(work,'fake-python');
  fs.writeFileSync(fakePython,'#!'+process.execPath+'\n'+`const fs=require('node:fs');const input=fs.readFileSync(0,'utf8');if(!input)process.exit(1);fs.writeFileSync(process.argv[3],Buffer.alloc(200));`,{mode:0o755});
  result=spawnSync(process.execPath,['tools/generate-audio.mjs'],{cwd:work,env:{...process.env,TTS_API_KEY:'',ONAM_VOICE_PYTHON:fakePython},encoding:'utf8'});
  assert.equal(result.status,0,result.stderr+result.stdout);
  manifest=JSON.parse(fs.readFileSync(path.join(work,'audio/manifest.json')));
  assert.equal(manifest.provider,'edge');assert.equal(manifest.voice,'tr-TR-EmelNeural');assert.ok(Object.keys(manifest.clips).length>12);
  console.log('PASS: default free provider generates all public clips without API key (speech executable mocked)');

 }finally{fs.rmSync(work,{recursive:true,force:true})}
 let load,ended=0,fallback=0,starts=0;
 const playerState={};
 class MockAudio{constructor(src){this.src=src;playerState.current=this}play(){playerState.current=this;this.onplaying?.();return Promise.resolve()}pause(){this.paused=true}removeAttribute(){}load(){}}
 const ctx={window:{addEventListener(name,fn){load=fn}},document:{getElementById(){return {textContent:''}}},Audio:MockAudio,fetch:async()=>({ok:true,json:async()=>({clips:{'public question':'audio/test.mp3'}})})};
 vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(root,'natural-audio.js'),'utf8'),ctx);await load();
 const api=ctx.window.onamNatural;const options={rate:1,start:()=>starts++,done:()=>ended++,fallback:()=>fallback++};
 assert.equal(api.play('private name or identity',options),false);
 assert.equal(api.play('public question',options),true);assert.equal(starts,1);api.setRate(.75);assert.equal(playerState.current.playbackRate,.75);api.pause();assert.equal(playerState.current.paused,true);await api.resume();
 const old=playerState.current;api.stop();old.onended();assert.equal(ended,0);
 api.play('public question',options);playerState.current.onerror();assert.equal(fallback,1);
 api.play('public question',options);playerState.current.onended();assert.equal(ended,1);
 console.log('PASS: public audio only, pause/resume/rate, stale completion ignored, playback failure fallback');
 const beforeDone=ended;
 api.playParts(['public question','public question'],options);api.setRate(.75);playerState.current.onended();assert.equal(ended,beforeDone);assert.equal(playerState.current.playbackRate,.75);playerState.current.onended();assert.equal(ended,beforeDone+1);
 console.log('PASS: recorded answer sequence uses same voice and preserves speed across clips');

})().catch(e=>{console.error(e);process.exit(1)});
