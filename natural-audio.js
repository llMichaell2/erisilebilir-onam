// Only pre-generated public form/question audio is used here. Answers never go to TTS.
(() => {
 let clips={},audio=null,session=0;
 const status=message=>{const el=document.getElementById('natural-status');if(el)el.textContent=message};
 window.addEventListener('DOMContentLoaded',async()=>{
  try{const r=await fetch('audio/manifest.json?v=3');if(!r.ok)throw Error();const m=await r.json();clips=m.clips||{};status(Object.keys(clips).length?'Form ve sorular bilgisayar tarafından oluşturulan doğal ses kayıtlarıyla okunur. Kişisel cevaplar cihaz sesiyle geri okunur.':'Doğal ses henüz etkin değil; şimdilik cihaz sesi kullanılıyor.')}catch{status('Doğal ses dosyaları yüklenemedi; cihaz sesi kullanılıyor.')}
 });
 function stop(){session++;if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio=null}}
 window.onamNatural={
  stop,pause(){audio?.pause()},resume(){audio?.play().catch(()=>status('Ses için tekrar okuma düğmesine basın.'))},setRate(rate){if(audio)audio.playbackRate=rate},
  play(message,{rate,start,done,fallback}){
   const src=clips[message];if(!src)return false;
   stop();const token=session;const player=new Audio(src);audio=player;player.playbackRate=rate;
   let failed=false;
   const fail=()=>{if(token!==session||failed)return;failed=true;stop();status('Doğal ses çalınamadı; cihaz sesiyle devam ediliyor.');fallback()};
   player.onplaying=()=>{if(token===session)start?.()};
   player.onended=()=>{if(token===session){audio=null;done?.()}};
   player.onerror=fail;player.play().catch(fail);return true;
  }
 };
})();
