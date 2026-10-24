(() => {
 'use strict';
 const $=id=>document.getElementById('qa-'+id);
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 const V=window.OnamValidation;
 const declaration='Onam formunu okudum, anladım, onaylıyorum';
 const questions=[
  {key:'name',label:'Ad soyad',prompt:'Adınız ve soyadınız nedir? Deneme için hayali bir ad ve soyad söyleyin.',validate:v=>/^[\p{L}][\p{L}’' -]+\s[\p{L}’' -]+$/u.test(v)?'':'Ad ve soyadı birlikte girin.'},
  {key:'tc',label:'T.C. kimlik numarası',prompt:'On bir haneli T.C. kimlik numaranız nedir? Rakamları tek tek söyleyin. Denemede gerçek kişisel bilgi kullanmayın.',clean:V.tc,error:'T.C. kimlik numarası on bir haneli olmalı ve kontrol basamakları geçerli olmalıdır. Bu kontrol kimliğinizi doğrulamaz.'},
  {key:'birthDate',label:'Doğum tarihi',prompt:'Doğum tarihiniz nedir? Gün, ay ve dört haneli yıl olarak söyleyin veya yazın.',clean:V.birth,error:'Geçerli bir doğum tarihi girin. Örnek biçim: 15.06.1990. Gelecek tarih kabul edilmez.'},
  {key:'phone',label:'Telefon',prompt:'Telefon numaranız nedir? Rakamları tek tek söyleyin veya başında sıfırla yazın.',clean:V.phone,error:'Geçerli bir Türkiye telefon numarası girin. Başında sıfırla on bir rakam olmalıdır.'},
  {key:'dateTime',label:'Tarih ve saat',prompt:'Form için tarih ve saati kontrol edin. Cihazınızın yerel tarih ve saati önerildi. Değiştirebilir veya doğrulayabilirsiniz.',clean:V.dateTime,error:'Geçerli tarih ve saat girin. Örnek biçim: 24.10.2026 14:30.'},
  {key:'declaration',label:'Son beyan',prompt:'Son beyanınız için şunu söyleyin veya yazın: Onam formunu okudum, anladım, onaylıyorum.',final:true}
 ];
 let step=0,phase='idle',answers={},candidate='',recognition=null,generation=0,report=null,confirmationText='',confirmationParts;
 const normalize=v=>v.toLocaleLowerCase('tr-TR').replace(/[.,!?]/g,'').trim();
 const yes=v=>['evet','doğru','evet doğru','bilgilerim doğru'].includes(normalize(v));
 const no=v=>['hayır','yanlış','hayır yanlış','düzelteceğim'].includes(normalize(v));
 function abortMic(){generation++;if(recognition){const old=recognition;recognition=null;old.abort()}$('listen').disabled=!Recognition||!['answer','confirm'].includes(phase)}
 window.addEventListener('onam-stop',()=>{const listening=!!recognition;abortMic();if(listening)$('status').textContent='Mikrofon durduruldu. Tekrar deneyebilir veya yazabilirsiniz.'});
 let voiceBank=null;
 fetch('voice-messages.json?v=7').then(r=>r.ok?r.json():null).then(bank=>{voiceBank=bank}).catch(()=>{});
 function say(message,parts){window.onamAudio.stop();window.onamAudio.speak(message,undefined,parts)}
 function controls(){
  const confirm=phase==='confirm';
  $('confirm').hidden=!confirm;$('correct').hidden=!confirm;
  $('submit').hidden=confirm;$('answer').readOnly=confirm;
  $('confirm').textContent=questions[step]?.final?'Beyanımı tamamla':'Bilgilerim doğru';
  $('listen').disabled=!Recognition;
  $('listen').textContent=confirm?'Mikrofonla doğrula veya düzelt':'Mikrofonla cevap ver';
 }
 function ask(){
  phase='answer';candidate='';confirmationText='';confirmationParts=undefined;$('answer').value=questions[step].key==='dateTime'?V.dateTime(V.localNow()):'';
  $('question').textContent=`Soru ${step+1} / ${questions.length}: ${questions[step].prompt}`;
  $('status').textContent=Recognition?'Soruyu dinledikten sonra mikrofon düğmesine basın veya cevabınızı yazın.':'Bu tarayıcıda sesli cevap desteklenmiyor. Cevabınızı yazabilirsiniz.';
  $('answer').inputMode=['tc','phone'].includes(questions[step].key)?'tel':'text';
  controls();$('question').focus();say(questions[step].prompt);
 }
 function submit(value){
  if(phase!=='answer')return;
  const q=questions[step];value=value.trim();
  if(!value){$('status').textContent='Cevap alınamadı. Tekrar konuşabilir veya yazabilirsiniz.';return}
  if(q.final){
   if(normalize(value)!==normalize(declaration)){
    const refusal=/onaylamıyorum|kabul etmiyorum|anlamadım|hayır/.test(normalize(value));
    $('status').textContent=refusal?'Onay vermediniz. Beyan tamamlanmadı.':'Beyan tamamlanmadı. Kabul ediyorsanız tam olarak şu cümleyi söyleyin: '+declaration;
    say($('status').textContent);return;
   }value=declaration;
  }
  if(q.clean){const cleaned=q.clean(value);if(!cleaned){$('status').textContent=q.error;say(q.error);return}value=cleaned}
  if(q.validate&&q.validate(value)){$('status').textContent=q.validate(value);say($('status').textContent);return}
  candidate=value;$('answer').value=value;phase='confirm';controls();
  const numeric=['tc','phone','birthDate','dateTime'].includes(q.key);
  const grouped=numeric?V.answerParts(q.key,value):[];
  const spoken=numeric?grouped.join(' '):value;
  const message=q.final?`Beyanınız: ${declaration}. Tamamlamak için aynı cümleyi tekrar söyleyebilir veya Beyanımı tamamla düğmesine basabilirsiniz.`:`${q.label} için cevabınız: ${spoken}. Bilgilerim doğru veya düzelteceğim diyebilirsiniz.`;
  const parts=voiceBank&&numeric?[voiceBank[q.key],...grouped,voiceBank.confirm]:undefined;
  confirmationText=message;confirmationParts=parts;
  $('status').textContent=message;say(message,parts);
 }
 function confirm(){
  if(phase!=='confirm')return;
  abortMic();answers[questions[step].key]={value:candidate,confirmedAt:new Date().toISOString()};
  step++;if(step<questions.length)ask();else finish();
 }
 function correct(){if(phase!=='confirm')return;abortMic();ask();$('answer').focus()}
 function finish(){
  phase='done';window.onamAudio.stop();$('work').hidden=true;$('result').hidden=false;
  report={type:'demo-only',formVersion:'bt-mr-photo-v1',completedAt:new Date().toISOString(),answers,identityVerified:false,clinicalConsentRecorded:false};
  const complete=questions.every(q=>answers[q.key]?.value);
  if(!complete)throw new Error('Zorunlu alan eksik');
  $('summary').textContent=questions.map(q=>`${q.label}: ${answers[q.key].value}`).join('\n')+'\n\nSon beyan deneme özetine eklendi. Hastane kaydı veya hukuken geçerli imza oluşturulmadı.';
  $('download').focus();say('Son beyanınız alındı. Deneme tamamlandı. Bilgileriniz yalnızca bu açık sayfada tutuluyor.');
 }
 function reset(){
  phase='idle';window.onamAudio.stop();answers={};candidate='';report=null;step=0;confirmationText='';confirmationParts=undefined;
  $('answer').value='';$('summary').textContent='';$('status').textContent='';$('question').textContent='';
  $('work').hidden=true;$('result').hidden=true;$('start').hidden=false;$('start').focus();
 }
 function listen(){
  if(!Recognition||!['answer','confirm'].includes(phase))return;
  window.onamAudio.stop();
  const token=generation;const expectedPhase=phase;const expectedStep=step;
  const rec=new Recognition();recognition=rec;rec.lang='tr-TR';rec.continuous=false;rec.interimResults=false;rec.maxAlternatives=1;
  let resultReceived=false,failed=false;
  $('listen').disabled=true;$('status').textContent='Mikrofon açılıyor. İzin istenirse izin verin.';
  rec.onstart=()=>{if(token===generation)$('status').textContent='Dinliyorum. Şimdi konuşabilirsiniz.'};
  rec.onresult=e=>{
   if(token!==generation||phase!==expectedPhase||step!==expectedStep)return;
   resultReceived=true;const value=e.results?.[0]?.[0]?.transcript||'';
   // End recognition before playing the confirmation, preventing microphone echo.
   abortMic();
   if(phase==='confirm'){if(questions[step].final?normalize(value)===normalize(declaration):yes(value))confirm();else if(no(value))correct();else{$('status').textContent='Doğrulama anlaşılmadı. Ekrandaki doğrula veya düzelt düğmesini kullanabilirsiniz.';say($('status').textContent)}}
   else{$('answer').value=value;submit(value)}
  };
  rec.onerror=e=>{
   if(token!==generation)return;failed=true;
   const messages={'not-allowed':'Mikrofon izni verilmedi. Chrome site ayarlarından izin verebilir veya cevabınızı yazabilirsiniz.','service-not-allowed':'Konuşma tanıma hizmeti kullanılamıyor. Yazıyla devam edebilirsiniz.','audio-capture':'Mikrofon bulunamadı. Bağlantıyı kontrol edin veya yazıyla devam edin.','no-speech':'Ses duyulmadı. Tekrar deneyin veya cevabınızı yazın.','network':'Konuşma tanıma hizmetine ulaşılamadı. İnterneti kontrol edin veya yazıyla devam edin.','aborted':'Mikrofon durduruldu.'};
   $('status').textContent=messages[e.error]||'Sesli cevap alınamadı. Tekrar deneyin veya yazıyla devam edin.';
  };
  rec.onend=()=>{if(token!==generation)return;recognition=null;$('listen').disabled=false;if(!resultReceived&&!failed)$('status').textContent='Cevap alınamadı. Tekrar deneyin veya yazıyla devam edin.'};
  try{rec.start()}catch{recognition=null;$('listen').disabled=false;$('status').textContent='Mikrofon başlatılamadı. Tekrar deneyin veya yazıyla devam edin.'}
 }
 $('start').onclick=()=>{reset();$('start').hidden=true;$('work').hidden=false;ask()};
 $('open').onclick=()=>{if(phase==='idle')$('start').click();document.getElementById('qa-panel').scrollIntoView({block:'start'})};
 $('submit').onclick=()=>submit($('answer').value);
 $('answer').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();submit($('answer').value)}};
 $('confirm').onclick=confirm;$('correct').onclick=correct;$('listen').onclick=listen;
 $('repeat').onclick=()=>say(phase==='confirm'?confirmationText:questions[step].prompt,phase==='confirm'?confirmationParts:undefined);
 $('reset').onclick=reset;$('clear').onclick=reset;
 $('download').onclick=()=>{if(!report)return;const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='onam-deneme-ozeti.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 window.addEventListener('pagehide',()=>{phase='idle';abortMic();answers={};report=null;candidate='';confirmationText='';confirmationParts=undefined;$('answer').value='';$('summary').textContent='';$('status').textContent='';$('work').hidden=true;$('result').hidden=true;$('start').hidden=false});
})();
