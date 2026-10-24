// Run from repository root: NODE_USE_ENV_PROXY=1 node tools/generate-audio.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
const key=process.env.TTS_API_KEY;
if(!key){console.error('TTS_API_KEY is missing. Set it securely in environment settings, never in repository files.');process.exit(1)}
vm.runInThisContext(fs.readFileSync('speech-text.js','utf8'));
const html=fs.readFileSync('index.html','utf8');
const data=JSON.parse(html.match(/const data = (\[[\s\S]*?\]);/)[1]);
const prompts=[...fs.readFileSync('qa.js','utf8').matchAll(/prompt:'([^']+)'/g)].map(m=>m[1]);
const messages=[...data.map(d=>d.title+'. '+d.text),...prompts];
const clips={};fs.mkdirSync('audio',{recursive:true});
for(const raw of messages){
 const input=globalThis.prepareSpeech(raw);
 const file='audio/'+crypto.createHash('sha256').update('coral-v1:'+input).digest('hex').slice(0,24)+'.mp3';
 if(!fs.existsSync(file)){
  const response=await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-4o-mini-tts',voice:'coral',input,response_format:'mp3',instructions:'Türkçe konuş. Sakin, sıcak ve doğal bir sesle, anlaşılır orta hızda oku. Tıbbi terimleri net söyle. Abartılı vurgu yapma. Kelimeleri kesik kesik veya zorlanarak söyleme. Noktalama işaretlerini seslendirme.'}),signal:AbortSignal.timeout(120000)});
  if(!response.ok){console.error(`Speech service failed: HTTP ${response.status}. Manifest not replaced; no credential values logged.`);process.exit(1)}
  if(!response.headers.get('content-type')?.startsWith('audio/'))throw Error('Unexpected response type');
  const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length<100)throw Error('Empty audio response');
  fs.writeFileSync(file,bytes);
 }
 clips[raw]=file;
}
// Commit audio and manifest together only after all public messages are generated.
fs.writeFileSync('audio/manifest.json',JSON.stringify({voice:'coral',generatedAt:new Date().toISOString(),clips},null,2)+'\n');
console.log(`${Object.keys(clips).length} public form/question recordings prepared. Listen to generated audio before publishing.`);
