// Trim only outer silence; keep spoken content and join entirely in the browser.
(function(root){
 function trim(samples,sampleRate){
  const windowSize=Math.max(1,Math.round(sampleRate*.01));
  const active=[];
  for(let start=0;start<samples.length;start+=windowSize){
   const end=Math.min(samples.length,start+windowSize);let energy=0;
   for(let i=start;i<end;i++)energy+=samples[i]*samples[i];
   if(Math.sqrt(energy/(end-start))>.002)active.push([start,end]);
  }
  if(!active.length)throw Error('Empty speech clip');
  const first=Math.max(0,active[0][0]-Math.round(sampleRate*.025));
  const last=Math.min(samples.length,active.at(-1)[1]+Math.round(sampleRate*.04));
  return samples.subarray(first,last);
 }
 function wav(buffers,sampleRate=24000){
  const parts=buffers.map(b=>trim(b,sampleRate));
  const lengths=parts.map((part,i)=>part.length+(i<parts.length-1?Math.round(sampleRate*((i===0||i===parts.length-2)?0.14:0.04)):0));
  const count=lengths.reduce((a,b)=>a+b,0);const output=new ArrayBuffer(44+count*2);const view=new DataView(output);
  function text(at,value){for(let i=0;i<value.length;i++)view.setUint8(at+i,value.charCodeAt(i))}
  text(0,'RIFF');view.setUint32(4,36+count*2,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,sampleRate,true);view.setUint32(28,sampleRate*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,count*2,true);
  let offset=44;
  parts.forEach((part,index)=>{for(const sample of part){view.setInt16(offset,Math.round(Math.max(-1,Math.min(1,sample))*32767),true);offset+=2}offset+=(lengths[index]-part.length)*2});
  return output;
 }
 let context;const decoded=new Map();
 async function load(url){
  if(!decoded.has(url)){
   const pending=(async()=>{
    const Decoder=root.OfflineAudioContext||root.webkitOfflineAudioContext;
    if(!Decoder)throw Error('Audio decoding unavailable');
    context??=new Decoder(1,1,24000);
    const response=await fetch(url);if(!response.ok)throw Error('Clip download failed');
    const buffer=await context.decodeAudioData(await response.arrayBuffer());
    // Voices are mono; average any additional channels instead of discarding them.
    const samples=new Float32Array(buffer.length);
    for(let c=0;c<buffer.numberOfChannels;c++){const channel=buffer.getChannelData(c);for(let i=0;i<samples.length;i++)samples[i]+=channel[i]/buffer.numberOfChannels}
    return samples;
   })();decoded.set(url,pending);pending.catch(()=>decoded.delete(url));
  }
  return decoded.get(url);
 }
 root.OnamAudioJoin={trim,wav,async create(urls){return new Blob([wav(await Promise.all(urls.map(load)))],{type:'audio/wav'})}};
})(globalThis);
