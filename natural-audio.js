// Public recordings only. Personal answer audio is assembled locally, never uploaded.
(() => {
 let clips={},audio=null,session=0,playbackRate=1,objectUrl=null,paused=false;
 const status=message=>{const el=document.getElementById('natural-status');if(el)el.textContent=message};
 window.addEventListener('DOMContentLoaded',async()=>{
  try{const r=await fetch('audio/manifest.json?v=9');if(!r.ok)throw Error();const m=await r.json();clips=m.clips||{};status(Object.keys(clips).length?'Form ve sorular bilgisayar tarafından oluşturulan doğal ses kayıtlarıyla okunur. Numaralar da aynı kayıt sesiyle okunur. Ad-soyad geri okuması cihaz sesine bağlıdır.':'Doğal ses henüz etkin değil; şimdilik cihaz sesi kullanılıyor.')}catch{status('Doğal ses dosyaları yüklenemedi; cihaz sesi kullanılıyor.')}
 });
 function releaseUrl(){if(objectUrl){URL.revokeObjectURL(objectUrl);objectUrl=null}}
 function stop(){session++;paused=false;if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio=null}releaseUrl()}
 window.onamNatural={
  stop,pause(){paused=true;audio?.pause()},resume(){paused=false;audio?.play().catch(()=>status('Ses için tekrar okuma düğmesine basın.'))},setRate(rate){playbackRate=rate;if(audio)audio.playbackRate=rate},
  play(message,options){return this.playParts([message],options)},
  playParts(parts,{rate,start,done,fallback}){
   if(!parts.length||parts.some(part=>!clips[part]))return false;
   stop();playbackRate=rate;const token=session;let failed=false,started=false;
   const fail=()=>{if(token!==session||failed)return;failed=true;stop();status('Doğal ses çalınamadı; cihaz sesiyle devam ediliyor.');fallback()};
   function play(src,onend){
    if(token!==session)return;
    const player=new Audio(src);audio=player;player.playbackRate=playbackRate;
    player.onplaying=()=>{if(token===session&&!started){started=true;start?.()}};
    player.onended=()=>{if(token===session)onend()};player.onerror=fail;
    if(!paused)player.play().catch(fail);
   }
   function finish(){audio=null;releaseUrl();done?.()}
   if(parts.length>1&&window.OnamAudioJoin){
    // One WAV removes per-file playback delays and excessive MP3 edge silence.
    window.OnamAudioJoin.create(parts.map(part=>clips[part])).then(blob=>{
     if(token!==session)return;
     objectUrl=URL.createObjectURL(blob);play(objectUrl,finish);
    }).catch(fail);
   }else{
    let index=0;
    function next(){if(token!==session)return;if(index>=parts.length){finish();return}play(clips[parts[index++]],next)}
    next();
   }
   return true;
  }
 };
})();
