const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const path=require('node:path');
const context={Float32Array,DataView,ArrayBuffer};vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../audio-join.js'),'utf8'),context);const join=context.OnamAudioJoin;
const sampleRate=24000;
function clip(silenceBefore=.5,sound=.3,silenceAfter=.8){const data=new Float32Array(Math.round((silenceBefore+sound+silenceAfter)*sampleRate));for(let i=Math.round(silenceBefore*sampleRate);i<Math.round((silenceBefore+sound)*sampleRate);i++)data[i]=Math.sin(i*.1)*.2;return data}
const original=clip();const trimmed=join.trim(original,sampleRate);assert.ok(trimmed.length/sampleRate<.4);assert.ok(trimmed.length/sampleRate>=.3);assert.ok(Math.max(...trimmed)>.19);
assert.throws(()=>join.trim(new Float32Array(2400),sampleRate),/Empty speech/);
const encoded=join.wav(Array.from({length:13},()=>original));const view=new DataView(encoded);assert.equal(view.getUint32(24,true),sampleRate);assert.equal(view.getUint16(22,true),1);assert.equal(view.getUint32(40,true),encoded.byteLength-44);const duration=view.getUint32(40,true)/2/sampleRate;assert.ok(duration<6);assert.ok(duration>3.9);assert.ok(original.length*13/sampleRate>20);
// Preserve quieter consonants next to an active word with safety padding.
const speech=clip();speech[Math.round(.49*sampleRate)]=.001;const safe=join.trim(speech,sampleRate);assert.ok([...safe].some(x=>Math.abs(x-.001)<.000001));
console.log('PASS: outer silence shortened, speech and quiet edges preserved, one valid WAV, 13-piece example reduced from >20s to <6s; silence-only clips rejected');
