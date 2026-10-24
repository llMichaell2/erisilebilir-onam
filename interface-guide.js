// Optional focus narration complements native screen readers; it never reads answer values.
(() => {
 'use strict';
 const toggle=document.getElementById('interface-guide-toggle'),checkbox=document.getElementById('welcome-voice-guide');
 if(!toggle||!checkbox)return;
 const status=document.getElementById('interface-guide-status');
 const supported='speechSynthesis' in window&&'SpeechSynthesisUtterance' in window;
 let enabled=false,timer=null,ownUtterance=null;
 const busy=()=>!!window.onamAudio?.isBusy?.()||!!window.onamMicActive?.()||document.hidden;
 const descriptions={
  'welcome-start':'Altı form bölümünü sırayla okur, okunan bölüme ilerler ve sonunda bilgiler kısmını açar.',
  'welcome-help':'Sayfanın nasıl kullanılacağını sesli anlatır. Formu veya mikrofonu başlatmaz.',
  'welcome-dismiss':'Başlangıç penceresini kapatır. Sayfayı kendi ekran okuyucunuzla veya yazılı olarak kullanabilirsiniz.',
  'welcome-voice-guide':'Açıkken düğmelere klavyeyle odaklandığınızda adları ve görevleri seslendirilir. Ekran okuyucunuz zaten konuşuyorsa kapalı bırakabilirsiniz.',
  'interface-guide-toggle':'İsteğe bağlı sesli düğme açıklamalarını açar veya kapatır. Form okunurken ve mikrofon açıkken açıklamalar araya girmez.',
  'interface-help-read':'Sayfanın düğmelerini ve sesli cevap adımlarını anlatır.',
  'text-size':'Sayfadaki metinleri büyütür veya normal boyuta döndürür.',
  'contrast':'Yüksek kontrast görünümünü açar veya kapatır.',
  'qa-open':'Doğrudan hasta bilgileri ve son beyan sorularına geçer. Form bölümlerini baştan okumaz.',
  'play':'Formun altı bölümünü baştan sona okur. Bilgiler kısmını kendiliğinden açmak için başlangıç penceresindeki sesli rehberi kullanın.',
  'previous':'Bir önceki form bölümünü okur.',
  'next':'Bir sonraki form bölümünü okur.',
  'stop':'Sesli okumayı ve mikrofonu durdurur. Otomatik ilerlemeyi iptal eder.',
  'pause':'Formun okunmasını geçici olarak duraklatır.',
  'resume':'Duraklatılmış form okumasını sürdürür.',
  'guided-stop':'Sesli rehber çubuğunda okumayı durdurur; bilgiler kısmına otomatik geçişi iptal eder.',
  'guided-pause':'Sesli rehber çubuğunda okumayı duraklatır.',
  'guided-resume':'Sesli rehber çubuğunda duraklatılmış okumayı sürdürür.',
  'go-current':'Ekranı ve klavye odağını o anda okunan form bölümünün başlığına taşır.',
  'voice-select':'Cevapların geri okunacağı cihaz sesini seçer. Seçim sonraki seslendirmede kullanılır.',
  'qa-auto':'Açıksa soru ve geri okuma bittikten sonra mikrofonun otomatik başlamasını dener. Mikrofon izni gerekir.',
  'qa-start':'Hasta bilgileri ve son beyan için altı soruluk akışı başlatır.',
  'qa-answer':'Sorulan bilginin cevap alanıdır. Konuşmak istemezseniz cevabınızı yazabilirsiniz. Buradaki kişisel bilgi sesli düğme rehberi tarafından okunmaz.',
  'qa-listen':'Mikrofonu başlatır veya yeniden başlatır. Korunan cevabınıza devam edebilirsiniz. İzin istenirse tarayıcıdan mikrofon izni verin.',
  'qa-repeat':'Şu anki soruyu veya cevap doğrulamasını yeniden okur.',
  'qa-submit':'Yazdığınız cevabı kontrol edip doğrulama için geri okur.',
  'qa-confirm':'Geri okunan cevabınızı onaylar ve bir sonraki adıma geçer. Son beyan adımında işlemi tamamlar.',
  'qa-correct':'Bu cevabı yeniden girebilmeniz için aynı soruyu baştan açar.',
  'qa-reset':'Okumayı ve mikrofonu durdurur; bu ekrandaki hasta cevaplarını temizler.',
  'qa-clear':'Bu ekrandaki form özetini ve cevapları temizler. Sunucuya kaydedilmiş formu silmez.',
  'qa-save-retry':'Kaydedilemeyen formu sunucuya göndermeyi yeniden dener.',
  'qa-qr-download':'Kaydedilen formun QR kodunu resim olarak indirir.',
  'qa-record-link':'Onaylanıp kaydedilmiş formun görüntüleneceği belgeyi açar.',
  'qa-download':'Form özetini JSON dosyası olarak indirir.'
 };
 for(const [id,description] of Object.entries(descriptions)){
  const control=document.getElementById(id);if(!control)continue;
  const hint=document.createElement('span');hint.id=id+'-help';hint.className='sr-only';hint.textContent=description;
  control.parentElement.appendChild(hint);
  const existing=control.getAttribute('aria-describedby');control.setAttribute('aria-describedby',[existing,hint.id].filter(Boolean).join(' '));
 }
 for(const button of document.querySelectorAll('[data-rate]'))button.setAttribute('aria-label',button.textContent+' okuma hızı');
 const intro='Erişilebilir onam formuna hoş geldiniz. Başlangıç penceresinde Sesli onam formunu başlat düğmesi bulunur. Bu düğme altı bölümü sırayla okur ve sonunda bilgiler kısmına geçer. Kullanımı sesli anlat düğmesi bu açıklamayı tekrarlar. Kendim okuyacağım düğmesi pencereyi kapatır. Bilgisayarda Tab ile sonraki, Shift ve Tab ile önceki düğmeye gidin. Enter veya boşluk ile düğmeyi çalıştırın. Okuma sırasında sayfanın altındaki rehber çubuğunda Duraklat, Devam et ve Durdur düğmeleri bulunur. Bilgiler kısmında ad-soyad ve doğum tarihi cevabınızı bitirince tamam deyin. T.C. ve telefon rakamlarını tek tek söyleyin. Baştan diyerek o cevabı temizleyebilirsiniz. Tarih ve saat için tamam deyin. Son beyan geri okunduktan sonra onaylıyorum diyerek bitirin. Ekran okuyucunuz zaten konuşuyorsa ek sesli düğme rehberini kapalı bırakabilirsiniz.';
 function stopOwn(){clearTimeout(timer);if(ownUtterance){ownUtterance=null;window.speechSynthesis.cancel()}}
 function speak(message){
  if(!supported)return;
  if(busy()){status.textContent='Form okunurken veya mikrofon açıkken düğme açıklamaları bekletilir.';return}
  stopOwn();
  const chunks=[];let part='';
  for(const word of message.split(/\s+/)){if(part.length+word.length>180){chunks.push(part);part=''}part+=(part?' ':'')+word}if(part)chunks.push(part);
  const voices=window.speechSynthesis.getVoices(),voice=voices.find(v=>/^tr(?:-|_|$)/i.test(v.lang));
  function next(){
   if(busy()||!chunks.length)return;
   const utterance=new SpeechSynthesisUtterance(chunks.shift());utterance.lang='tr-TR';utterance.rate=1;if(voice)utterance.voice=voice;
   ownUtterance=utterance;
   utterance.onend=()=>{if(ownUtterance!==utterance)return;ownUtterance=null;next()};
   utterance.onerror=()=>{if(ownUtterance===utterance)ownUtterance=null};
   window.speechSynthesis.speak(utterance);
  }
  next();
 }
 function setEnabled(value,announce=true){
  enabled=supported&&value;toggle.setAttribute('aria-pressed',String(enabled));toggle.textContent='Sesli düğme rehberi: '+(enabled?'açık':'kapalı');checkbox.checked=enabled;
  if(announce){try{localStorage.setItem('onam-interface-guide',String(enabled))}catch{};stopOwn();status.textContent=enabled?'Sesli düğme rehberi açıldı. Tab ile düğmelere giderek görevlerini dinleyebilirsiniz.':'Sesli düğme rehberi kapatıldı.';if(enabled)speak(status.textContent)}
 }
 toggle.disabled=checkbox.disabled=!supported;
 try{setEnabled(localStorage.getItem('onam-interface-guide')==='true',false)}catch{setEnabled(false,false)}
 toggle.onclick=()=>setEnabled(!enabled);checkbox.onchange=()=>setEnabled(checkbox.checked);
 for(const id of ['welcome-help','interface-help-read'])document.getElementById(id).onclick=()=>speak(intro);
 document.addEventListener('focusin',event=>{
  clearTimeout(timer);if(!enabled)return;
  const control=event.target.closest('button,a[href],input,select,summary');if(!control||control.disabled)return;
  timer=setTimeout(()=>{
   if(document.activeElement!==control||busy())return;
   const label=control.getAttribute('aria-label')||control.labels?.[0]?.textContent||control.textContent.trim();
   const description=descriptions[control.id]||control.getAttribute('aria-label')||'';
   const state=control.hasAttribute('aria-pressed')?(control.getAttribute('aria-pressed')==='true'?' Açık.':' Kapalı.'):control.type==='checkbox'?(control.checked?' İşaretli.':' İşaretli değil.') :'';
   speak(label+'. '+description+state);
  },250);
 });
 window.addEventListener('onam-stop',stopOwn);
 window.addEventListener('pagehide',stopOwn);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopOwn()});
})();
