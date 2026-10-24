// Only pre-generated public form/question audio is used here. Answers never go to TTS.
(() => {
 let clips={},audio=null,session=0,playbackRate=1;
 const status=message=>{const el=document.getElementById('natural-status');if(el)el.textContent=message};
 window.addEventListener('DOMContentLoaded',async()=>{
  try{const r=await fetch('audio/manifest.json?v=5');if(!r.ok)throw Error();const m=await r.json();clips=m.clips||{};status(Object.keys(clips).length?'Form ve sorular bilgisayar tarafından oluşturulan doğal ses kayıtlarıyla okunur. Numaralar da aynı kayıt sesiyle okunur. Ad-soyad geri okuması cihaz sesine bağlıdır.':'Doğal ses henüz etkin değil; şimdilik cihaz sesi kullanılıyor.')}catch{status('Doğal ses dosyaları yüklenemedi; cihaz sesi kullanılıyor.')}
 });
 function stop(){session++;if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio=null}}
 window.onamNatural={
  stop,pause(){audio?.pause()},resume(){audio?.play().catch(()=>status('Ses için tekrar okuma düğmesine basın.'))},setRate(rate){playbackRate=rate;if(audio)audio.playbackRate=rate},
  play(message,options){return this.playParts([message],options)},
  playParts(parts,{rate,start,done,fallback}){
   if(!parts.length||parts.some(part=>!clips[part]))return false;
   stop();playbackRate=rate;const token=session;let index=0,failed=false,started=false;
   const fail=()=>{if(token!==session||failed)return;failed=true;stop();status('Doğal ses çalınamadı; cihaz sesiyle devam ediliyor.');fallback()};
   function next(){
    if(token!==session)return;
    if(index>=parts.length){audio=null;done?.();return}
    const player=new Audio(clips[parts[index++]]);audio=player;player.playbackRate=playbackRate;
    player.onplaying=()=>{if(token===session&&!started){started=true;start?.()}};
    player.onended=next;player.onerror=fail;player.play().catch(fail);
   }
   next();return true;
  }
 };
})();
