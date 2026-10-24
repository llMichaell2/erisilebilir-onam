(() => {
 'use strict';
 const $=id=>document.getElementById('qa-'+id);
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 const V=window.OnamValidation;
 const declaration='Onam formunu okudum, anladım, onaylıyorum';
 const questions=[
  {key:'name',label:'Ad soyad',prompt:'Adınız ve soyadınız nedir?',validate:v=>/^[\p{L}][\p{L}’' -]+\s[\p{L}’' -]+$/u.test(v)?'':'Ad ve soyadı birlikte girin.'},
  {key:'tc',label:'T.C. kimlik numarası',prompt:'On bir haneli T.C. kimlik numaranız nedir? Rakamları tek tek söyleyin.',clean:V.tc,error:'T.C. kimlik numarası on bir haneli olmalı ve kontrol basamakları geçerli olmalıdır. Bu kontrol kimliğinizi doğrulamaz.'},
  {key:'birthDate',label:'Doğum tarihi',prompt:'Doğum tarihiniz nedir? Gün, ay ve dört haneli yıl olarak söyleyin veya yazın.',clean:V.birth,error:'Geçerli bir doğum tarihi girin. Örnek biçim: 15.06.1990. Gelecek tarih kabul edilmez.'},
  {key:'phone',label:'Telefon',prompt:'Telefon numaranız nedir? Rakamları tek tek söyleyin veya başında sıfırla yazın.',clean:V.phone,error:'Geçerli bir Türkiye telefon numarası girin. Başında sıfırla on bir rakam olmalıdır.'},
  {key:'dateTime',label:'Tarih ve saat',prompt:'Form için tarih ve saati kontrol edin. Cihazınızın yerel tarih ve saati önerildi. Değiştirebilir veya doğrulayabilirsiniz.',clean:V.dateTime,error:'Geçerli tarih ve saat girin. Örnek biçim: 24.10.2026 14:30.'},
  {key:'declaration',label:'Son beyan',prompt:'Son beyanınız için şunu söyleyin veya yazın: Onam formunu okudum, anladım, onaylıyorum.',final:true}
 ];
 let step=0,phase='idle',answers={},candidate='',recognition=null,generation=0,report=null,receiptKey=null,saveGeneration=0,confirmationText='',confirmationParts;
 const normalize=v=>v.toLocaleLowerCase('tr-TR').replace(/[.,!?]/g,'').trim();
 const yes=v=>['evet','doğru','evet doğru','bilgilerim doğru'].includes(normalize(v));
 const no=v=>['hayır','yanlış','hayır yanlış','düzelteceğim'].includes(normalize(v));
 let micTimeout=null,restartTimer=null,speechMuted=true,internalStop=false,keepMic=false,restarts=0;
 function abortMic(){clearTimeout(micTimeout);clearTimeout(restartTimer);keepMic=false;speechMuted=true;generation++;if(recognition){const old=recognition;recognition=null;old.abort()}$('listen').disabled=!Recognition||!['answer','confirm'].includes(phase)}
 window.addEventListener('onam-stop',()=>{if(internalStop)return;const listening=!!recognition;abortMic();if(listening)$('status').textContent='Mikrofon durduruldu. Tekrar deneyebilir veya yazabilirsiniz.'});
 let voiceBank=null;
 fetch('voice-messages.json?v=9').then(r=>r.ok?r.json():null).then(bank=>{voiceBank=bank}).catch(()=>{});
 function pauseCapture(){
  clearTimeout(micTimeout);speechMuted=true;
  if(recognition){recognition.armed=false;recognition.pending='';recognition.cursor=recognition.count||0}
  if(!keepMic)abortMic();
 }
 function stopPlayback(){internalStop=true;try{window.onamAudio.stop()}finally{internalStop=false}}
 function armTimeout(){
  clearTimeout(micTimeout);const token=generation;
  micTimeout=setTimeout(()=>{if(token!==generation)return;abortMic();$('status').textContent='Sesli cevap alınamadı. Mikrofon düğmesiyle oturumu yeniden başlatın veya yazıyla devam edin.'},25000);
 }
 function say(message,parts){
  pauseCapture();stopPlayback();
  const token=generation,expectedPhase=phase,expectedStep=step;
  window.onamAudio.speak(message,()=>{
   if(token===generation&&phase===expectedPhase&&step===expectedStep&&$('auto').checked&&!document.hidden&&['answer','confirm'].includes(phase)){
    speechMuted=false;
    if(recognition){$('status').textContent='Dinliyorum. Şimdi konuşabilirsiniz.';armTimeout()}
    else if(keepMic)listen(false);
   }
  },parts);
 }
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
  $('status').textContent=Recognition?'Soru bittikten sonra otomatik dinleme açıksa konuşabilirsiniz. Cevabınızı yazabilirsiniz.':'Bu tarayıcıda sesli cevap desteklenmiyor. Cevabınızı yazabilirsiniz.';
  $('answer').inputMode=['tc','phone'].includes(questions[step].key)?'tel':'text';
  controls();$('question').focus();say(questions[step].prompt);
 }
 function submit(value){
  if(phase!=='answer')return;
  pauseCapture();const q=questions[step];value=value.trim();
  if(q.key==='dateTime'&&yes(value))value=$('answer').value;
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
  pauseCapture();answers[questions[step].key]={value:candidate,confirmedAt:new Date().toISOString()};
  step++;if(step<questions.length)ask();else finish();
 }
 function correct(){if(phase!=='confirm')return;pauseCapture();ask();$('answer').focus()}
 function finish(){
  phase='done';window.onamAudio.stop();$('work').hidden=true;$('result').hidden=false;
  receiptKey=window.OnamRecords.createKey();
  report={type:'patient-declaration',submissionId:crypto.randomUUID(),formVersion:'bt-mr-photo-v1',completedAt:new Date().toISOString(),answers,identityVerified:false,clinicalConsentRecorded:false};
  const complete=questions.every(q=>answers[q.key]?.value);
  if(!complete)throw new Error('Zorunlu alan eksik');
  $('summary').textContent=questions.map(q=>`${q.label}: ${answers[q.key].value}`).join('\n');
  $('download').focus();say('Son beyanınız alındı. İşlem tamamlandı.');saveReport();
 }
 async function saveReport(){
  if(!report)return;
  const token=++saveGeneration;const currentReport=report;
  $('save-retry').hidden=true;$('receipt').hidden=true;$('save-status').textContent='Form sisteme gönderiliyor…';
  try{
   const id=await window.OnamRecords.submit(currentReport,receiptKey);
   if(token!==saveGeneration||report!==currentReport)return;
   const url=window.OnamRecords.recordUrl(receiptKey);currentReport.recordId=id;
   $('save-status').textContent='Form kaydedildi. QR kodu indirebilir ve sağlık çalışanınızla paylaşabilirsiniz.';
   window.OnamQR.render($('qr'),url);
   $('record-link').href=url;$('receipt').hidden=false;
  }catch(error){if(token!==saveGeneration||report!==currentReport)return;$('save-status').textContent=error.message;$('save-retry').hidden=!window.OnamRecords.configured}
 }
 function clearReceipt(){saveGeneration++;$('qr').replaceChildren();$('receipt').hidden=true;$('record-link').removeAttribute('href');$('save-status').textContent='';$('save-retry').hidden=true}
 function reset(){
  abortMic();clearReceipt();phase='idle';window.onamAudio.stop();answers={};candidate='';report=null;receiptKey=null;step=0;confirmationText='';confirmationParts=undefined;
  $('answer').value='';$('summary').textContent='';$('status').textContent='';$('question').textContent='';
  $('work').hidden=true;$('result').hidden=true;$('start').hidden=false;$('start').focus();
 }
 function listen(manual=true){
  if(!Recognition||!['answer','confirm'].includes(phase))return;
  if(manual){pauseCapture();stopPlayback();keepMic=$('auto').checked;restarts=0;speechMuted=false}
  if(recognition){if(!speechMuted){$('status').textContent='Dinliyorum. Şimdi konuşabilirsiniz.';armTimeout()}return}
  const token=generation;
  const rec=new Recognition();recognition=rec;
  rec.lang='tr-TR';rec.continuous=keepMic;rec.interimResults=true;rec.maxAlternatives=1;
  rec.cursor=0;rec.count=0;rec.pending='';rec.armed=false;
  const current=()=>token===generation&&recognition===rec;
  let failed=false;
  $('listen').disabled=true;
  rec.onstart=()=>{if(current()&&!speechMuted)$('status').textContent='Dinliyorum. Şimdi konuşabilirsiniz.'};
  rec.onspeechstart=()=>{if(current())rec.armed=!speechMuted};
  function acceptTranscript(value){
   if(!current()||speechMuted||!rec.armed||!value.trim())return;
   restarts=0;rec.pending='';pauseCapture();
   if(phase==='confirm'){
    if(questions[step].final?normalize(value)===normalize(declaration):yes(value))confirm();
    else if(no(value))correct();
    else{$('status').textContent='Doğrulama anlaşılmadı. Bilgilerim doğru veya düzelteceğim deyin.';say($('status').textContent)}
   }else if(phase==='answer')submit(value);
  }
  rec.onresult=e=>{
   if(!current())return;
   const results=Array.from(e.results||[]);rec.count=results.length;
   if(speechMuted||!rec.armed){rec.cursor=results.length;rec.pending='';return}
   const fresh=results.slice(rec.cursor);
   rec.pending=fresh.map(r=>r[0]?.transcript||'').join(' ').trim();
   if(!rec.pending)return;
   if(phase==='answer'&&questions[step].key!=='dateTime')$('answer').value=rec.pending;
   $('status').textContent='Duyduğum: '+rec.pending;
   if(fresh.length&&fresh.every(r=>r.isFinal)){rec.cursor=results.length;acceptTranscript(rec.pending)}
  };
  rec.onerror=e=>{
   if(!current())return;
   // A quiet continuous session may end normally; fatal errors require a new gesture.
   if(e.error==='no-speech'&&keepMic)return;
   failed=true;abortMic();
   const messages={'not-allowed':'Mikrofon izni verilmedi. İzin verebilir veya yazıyla devam edebilirsiniz.','service-not-allowed':'Konuşma tanıma hizmeti kullanılamıyor. Yazıyla devam edebilirsiniz.','audio-capture':'Mikrofon bulunamadı. Bağlantıyı kontrol edin veya yazıyla devam edin.','network':'Konuşma tanıma hizmetine ulaşılamadı. İnterneti kontrol edin veya yazıyla devam edin.'};
   $('status').textContent=messages[e.error]||'Sesli cevap alınamadı. Mikrofon düğmesiyle tekrar deneyin veya yazıyla devam edin.';
  };
  rec.onend=()=>{
   if(!current())return;
   if(rec.pending&&!failed)acceptTranscript(rec.pending);
   if(!current())return;
   recognition=null;$('listen').disabled=!Recognition;
   if(keepMic&&!document.hidden&&['answer','confirm'].includes(phase)&&restarts++<2){
    restartTimer=setTimeout(()=>{if(token===generation&&keepMic)listen(false)},300);
   }else{abortMic();if(!failed)$('status').textContent='Mikrofon oturumu sona erdi. Mikrofon düğmesiyle yeniden başlatın veya yazıyla devam edin.'}
  };
  try{rec.start();if(!speechMuted)armTimeout()}catch{if(current()){abortMic();$('status').textContent='Mikrofon başlatılamadı. Mikrofon düğmesine basın veya yazıyla devam edin.'}}
 }
 $('start').onclick=()=>{reset();$('start').hidden=true;$('work').hidden=false;phase='answer';if($('auto').checked&&Recognition)listen();ask()};
 $('open').onclick=()=>{if(phase==='idle')$('start').click();document.getElementById('qa-panel').scrollIntoView({block:'start'})};
 $('submit').onclick=()=>submit($('answer').value);
 $('answer').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();submit($('answer').value)}};
 $('auto').disabled=!Recognition;
 $('auto').onchange=()=>{if(!$('auto').checked)abortMic()};
 $('answer').oninput=()=>abortMic();
 document.addEventListener('visibilitychange',()=>{if(document.hidden)abortMic()});
 $('confirm').onclick=confirm;$('correct').onclick=correct;$('listen').onclick=()=>listen();
 $('repeat').onclick=()=>say(phase==='confirm'?confirmationText:questions[step].prompt,phase==='confirm'?confirmationParts:undefined);
 $('qr-download').onclick=()=>window.OnamQR.download($('qr')).catch(()=>{$('save-status').textContent='QR indirilemedi. Tekrar deneyin.'});
 $('save-retry').onclick=saveReport;
 $('reset').onclick=reset;$('clear').onclick=reset;
 $('download').onclick=()=>{if(!report)return;const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='onam-formu.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 window.addEventListener('pagehide',()=>{clearReceipt();phase='idle';abortMic();answers={};report=null;receiptKey=null;candidate='';confirmationText='';confirmationParts=undefined;$('answer').value='';$('summary').textContent='';$('status').textContent='';$('work').hidden=true;$('result').hidden=true;$('start').hidden=false});
})();
