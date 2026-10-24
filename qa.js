(() => {
 'use strict';
 const $=id=>document.getElementById('qa-'+id);
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 const V=window.OnamValidation;
 window.onamMicActive=()=>!!recognition;
 const declaration='Onam formunu okudum, anladım, onaylıyorum';
 const questions=[
  {key:'name',label:'Ad soyad',prompt:'Adınız ve soyadınız nedir? Cevabınız bitince tamam deyin.',validate:v=>/^[\p{L}][\p{L}’' -]+\s[\p{L}’' -]+$/u.test(v)?'':'Ad ve soyadı birlikte girin.'},
  {key:'tc',label:'T.C. kimlik numarası',prompt:'On bir haneli T.C. kimlik numaranız nedir? Rakamları tek tek söyleyin.',clean:V.tc,error:'T.C. kimlik numarası on bir haneli olmalı ve kontrol basamakları geçerli olmalıdır. Bu kontrol kimliğinizi doğrulamaz.'},
  {key:'birthDate',label:'Doğum tarihi',prompt:'Doğum tarihiniz nedir? Örneğin beş ekim iki bin beş. Duraksayabilirsiniz. Tarihin tamamını söyledikten sonra tamam deyin.',clean:V.birth,error:'Geçerli bir doğum tarihi girin. Örnek biçim: 15.06.1990. Gelecek tarih kabul edilmez.'},
  {key:'phone',label:'Telefon',prompt:'Telefon numaranız nedir? Rakamları tek tek söyleyin veya başında sıfırla yazın.',clean:V.phone,error:'Geçerli bir Türkiye telefon numarası girin. Başında sıfırla on bir rakam olmalıdır.'},
  {key:'dateTime',label:'Tarih ve saat',prompt:'Tarih ve saat cihazınızdan otomatik alınır. Kabul etmek için tamam deyin. Değiştirmek için tarihi, saat ve dakika diyerek zamanı söyleyin; bitince tamam deyin.',clean:V.dateTime,error:'Geçerli tarih ve saat girin. Örnek biçim: 24.10.2026 14:30.'},
  {key:'declaration',label:'Son beyan',prompt:'Son beyanınız için şunu söyleyin veya yazın: Onam formunu okudum, anladım, onaylıyorum.',final:true}
 ];
 let step=0,phase='idle',answers={},candidate='',recognition=null,generation=0,report=null,receiptKey=null,saveGeneration=0,confirmationText='',confirmationParts,questionSpeech='';
 const normalize=v=>v.toLocaleLowerCase('tr-TR').replace(/[.,!?]/g,'').trim();
 const yes=v=>['evet','tamam','doğru','evet doğru','bilgilerim doğru'].includes(normalize(v));
 const finishApproval=v=>['beyanımı tamamla','onaylıyorum',normalize(declaration)].includes(normalize(v));
 const no=v=>['hayır','yanlış','hayır yanlış','düzelteceğim'].includes(normalize(v));
 let micTimeout=null,answerDraft='';
 const collectingAnswer=()=>phase==='answer';
 const spokenDigits=value=>value.toLocaleLowerCase('tr-TR').split(/[\s,;.:()＋+–—-]+/).map(w=>({sıfır:'0',bir:'1',iki:'2',üç:'3',dört:'4',beş:'5',altı:'6',yedi:'7',sekiz:'8',dokuz:'9'}[w]??w)).join('');
 function abortMic(){clearTimeout(micTimeout);generation++;if(recognition){const old=recognition;recognition=null;old.abort()}$('listen').disabled=!Recognition||!['answer','confirm'].includes(phase)}
 window.addEventListener('onam-stop',()=>{const listening=!!recognition;abortMic();if(listening)$('status').textContent='Mikrofon durduruldu. Tekrar deneyebilir veya yazabilirsiniz.'});
 let voiceBank=null;
 fetch('voice-messages.json?v=9').then(r=>r.ok?r.json():null).then(bank=>{voiceBank=bank}).catch(()=>{});
 function say(message,parts){
  window.onamAudio.stop();
  const token=generation,expectedPhase=phase,expectedStep=step;
  window.onamAudio.speak(message,()=>{
   if(token===generation&&phase===expectedPhase&&step===expectedStep&&$('auto').checked&&!document.hidden)listen();
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
  phase='answer';answerDraft='';candidate='';confirmationText='';confirmationParts=undefined;$('answer').value=questions[step].key==='dateTime'?V.dateTime(V.localNow()):'';
  const q=questions[step];
  const answerLabel=document.getElementById('qa-answer-label');if(answerLabel)answerLabel.textContent=q.label+' — cevabınız';
  questionSpeech=q.key==='dateTime'?`Tarih ve saat cihazınızdan alındı: ${V.answerParts('dateTime',$('answer').value).join(' ')}. Doğruysa tamam deyin. Düzeltmek için yeni tarih ve saati söyleyip tamam deyin veya yazın.`:q.prompt;
  $('question').textContent=`Soru ${step+1} / ${questions.length}: ${q.prompt}${q.key==='dateTime'?' Önerilen: '+$('answer').value:''}`;
  $('status').textContent=Recognition?'Soru bittikten sonra otomatik dinleme açıksa konuşabilirsiniz. Cevabınızı yazabilirsiniz.':'Bu tarayıcıda sesli cevap desteklenmiyor. Cevabınızı yazabilirsiniz.';
  $('answer').inputMode=['tc','phone'].includes(questions[step].key)?'tel':'text';
  controls();$('question').focus();say(questionSpeech);
 }
 function submit(value){
  if(phase!=='answer')return;
  abortMic();answerDraft='';const q=questions[step];value=value.trim();
  const acceptSuggested=q.key==='dateTime'&&yes(value);
  if(acceptSuggested)value=$('answer').value;
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
  candidate=value;$('answer').value=value;phase='confirm';
  if(acceptSuggested){confirm();return}
  controls();
  const numeric=['tc','phone','birthDate','dateTime'].includes(q.key);
  const grouped=numeric?V.answerParts(q.key,value):[];
  const spoken=numeric?grouped.join(' '):value;
  const message=q.final?`Beyanınız: ${declaration}. İşlemi bitirmek için beyanımı tamamla veya onaylıyorum deyin. Beyanımı tamamla düğmesine de basabilirsiniz.`:`${q.label} için cevabınız: ${spoken}. Bilgilerim doğru veya düzelteceğim diyebilirsiniz.`;
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
  receiptKey=window.OnamRecords.createKey();
  report={type:'patient-declaration',submissionId:crypto.randomUUID(),formVersion:'bt-mr-photo-v1',completedAt:new Date().toISOString(),answers,identityVerified:false,clinicalConsentRecorded:false};
  const complete=questions.every(q=>answers[q.key]?.value);
  if(!complete)throw new Error('Zorunlu alan eksik');
  $('summary').textContent=questions.map(q=>`${q.label}: ${answers[q.key].value}`).join('\n');
  $('download').focus();say('Son beyanınız alındı. İşlem tamamlandı. Geçmiş olsun. Sağlıklı günler dileriz.');saveReport();
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
  abortMic();clearReceipt();phase='idle';answerDraft='';window.onamAudio.stop();answers={};candidate='';report=null;receiptKey=null;step=0;confirmationText='';confirmationParts=undefined;
  $('answer').value='';$('summary').textContent='';$('status').textContent='';$('question').textContent='';
  $('work').hidden=true;$('result').hidden=true;$('start').hidden=false;$('start').focus();
 }
 function listen(){
  if(!Recognition||!['answer','confirm'].includes(phase))return;
  abortMic();window.onamAudio.stop();
  const token=generation;const expectedPhase=phase;const expectedStep=step;
  const rec=new Recognition();recognition=rec;rec.lang='tr-TR';rec.continuous=collectingAnswer();rec.interimResults=true;rec.maxAlternatives=1;
  let resultReceived=false,failed=false,pending='';
  const collectMode=collectingAnswer(),q=questions[step];let prefix=collectMode?answerDraft:'',resultOffset=0;
  $('listen').disabled=false;$('listen').textContent='Mikrofonu yeniden başlat';$('status').textContent='Mikrofon açılıyor. İzin istenirse izin verin.';
  rec.onstart=()=>{if(token===generation)$('status').textContent='Dinliyorum. Şimdi konuşabilirsiniz.'};
  function acceptTranscript(value){
   if(token!==generation||phase!==expectedPhase||step!==expectedStep)return;
   if(!value.trim())return;resultReceived=true;
   // End recognition before playing the confirmation, preventing microphone echo.
   abortMic();
   if(phase==='confirm'){if(questions[step].final?finishApproval(value):yes(value))confirm();else if(no(value))correct();else{$('status').textContent=questions[step].final?'Beyan tamamlanmadı. Bitirmek istiyorsanız beyanımı tamamla veya onaylıyorum deyin.':'Doğrulama anlaşılmadı. Ekrandaki doğrula veya düzelt düğmesini kullanabilirsiniz.';say($('status').textContent)}}
   else{submit(value)}
  }
  rec.onresult=e=>{
   if(token!==generation||phase!==expectedPhase||step!==expectedStep)return;
   const results=Array.from(e.results||[]);
   const fresh=results.slice(resultOffset),final=!!fresh.length&&fresh.every(r=>r.isFinal);
   if(collectMode&&final&&['baştan','yeniden başla'].includes(normalize(fresh[fresh.length-1][0]?.transcript||''))){
    prefix='';resultOffset=results.length;answerDraft='';pending='';$('answer').value=q.key==='dateTime'?V.dateTime(V.localNow()):'';
    $('status').textContent='Cevap temizlendi. Baştan söyleyebilirsiniz.';return;
   }
   pending=[prefix,fresh.map(r=>r[0]?.transcript||'').join(' ')].filter(Boolean).join(' ').trim();
   if(expectedPhase==='answer'&&!(questions[step].key==='dateTime'&&yes(pending)))$('answer').value=pending;
   $('status').textContent=pending?'Duyduğum: '+pending:'Dinliyorum. Şimdi konuşabilirsiniz.';
   if(collectMode){
    answerDraft=pending;
    const finished=/(?:^|\s)(?:cevabım bitti|tamam|bitti)[.,!?]*$/iu.test(pending);
    const value=finished?pending.replace(/(?:^|\s)(?:cevabım bitti|tamam|bitti)[.,!?]*$/iu,'').trim():pending;
    if(!final)return;
    if(q.key==='dateTime'&&yes(pending)){acceptTranscript(pending);return}
    if(finished){if(!value){prefix='';resultOffset=results.length;answerDraft='';pending='';$('answer').value='';$('status').textContent='Cevap alınamadı. Önce cevabınızı söyleyin, sonra tamam deyin.';return}acceptTranscript(value);return}
        if(q.final){
     if(normalize(value)===normalize(declaration)||yes(value)||/onaylamıyorum|kabul etmiyorum|anlamadım|hayır/.test(normalize(value)))acceptTranscript(value);
     else $('status').textContent='Duyduğum: '+pending+'. Beyanın devamını söyleyebilirsiniz.';
     return;
    }
    if(['tc','phone'].includes(q.key)){
     const digits=spokenDigits(pending),needed=q.key==='tc'?11:(digits.startsWith('90')?12:digits.startsWith('0')?11:10);
     const count=/^\d*$/.test(digits)?digits.length:0;
     $('status').textContent=`Duyduğum: ${pending}. ${count} rakam alındı. Duraksayabilirsiniz. Baştan demek cevabı temizler.`;
     if(/^\d+$/.test(digits)&&count>=needed)acceptTranscript(pending);
    }else $('status').textContent='Duyduğum: '+pending+'. Devam edebilirsiniz. Cevabınızın tamamını söyledikten sonra tamam deyin. Baştan demek cevabı temizler.';
   }else if(final)acceptTranscript(pending);
  };
  rec.onerror=e=>{
   if(token!==generation)return;failed=true;abortMic();
   const messages={'not-allowed':'Mikrofon izni verilmedi. Chrome site ayarlarından izin verebilir veya cevabınızı yazabilirsiniz.','service-not-allowed':'Konuşma tanıma hizmeti kullanılamıyor. Yazıyla devam edebilirsiniz.','audio-capture':'Mikrofon bulunamadı. Bağlantıyı kontrol edin veya yazıyla devam edin.','no-speech':'Ses duyulmadı. Tekrar deneyin veya cevabınızı yazın.','network':'Konuşma tanıma hizmetine ulaşılamadı. İnterneti kontrol edin veya yazıyla devam edin.','aborted':'Mikrofon durduruldu.'};
   $('status').textContent=messages[e.error]||'Sesli cevap alınamadı. Tekrar deneyin veya yazıyla devam edin.';
  };
  rec.onend=()=>{if(token!==generation)return;clearTimeout(micTimeout);recognition=null;if(pending&&!failed&&!resultReceived){if(collectMode){answerDraft=pending;$('listen').disabled=false;$('listen').textContent='Cevaba devam etmek için konuş';$('status').textContent='Dinleme oturumu sona erdi. Söyledikleriniz korundu. Mikrofon düğmesine basıp kaldığınız yerden devam edebilir veya yazıyla tamamlayabilirsiniz.';return}acceptTranscript(pending);return}$('listen').disabled=false;if(!resultReceived&&!failed)$('status').textContent='Cevap alınamadı. Tekrar deneyin veya yazıyla devam edin.'};
  try{rec.start();micTimeout=setTimeout(()=>{
   if(token!==generation)return;
   abortMic();$('status').textContent='Konuşma tanıma sonucu gelmedi. Mikrofonla cevap ver düğmesiyle tekrar deneyin. Telefonun mikrofon iznini ve sesle yazma ayarlarını kontrol edin veya yazıyla devam edin.';
  },collectMode?120000:25000)}catch{recognition=null;$('listen').disabled=false;$('status').textContent='Mikrofon başlatılamadı. Tekrar deneyin veya yazıyla devam edin.'}
 }
 $('start').onclick=()=>{reset();$('start').hidden=true;$('work').hidden=false;ask()};
 $('open').onclick=()=>{if(phase==='idle')$('start').click();document.getElementById('qa-panel').scrollIntoView({block:'start'})};
 $('submit').onclick=()=>submit($('answer').value);
 $('answer').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();submit($('answer').value)}};
 $('auto').disabled=!Recognition;
 $('auto').onchange=()=>{if(!$('auto').checked)abortMic()};
 $('answer').oninput=()=>{answerDraft='';abortMic()};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)abortMic()});
 $('confirm').onclick=confirm;$('correct').onclick=correct;$('listen').onclick=listen;
 $('repeat').onclick=()=>say(phase==='confirm'?confirmationText:questionSpeech,phase==='confirm'?confirmationParts:undefined);
 $('qr-download').onclick=()=>window.OnamQR.download($('qr')).catch(()=>{$('save-status').textContent='QR indirilemedi. Tekrar deneyin.'});
 $('save-retry').onclick=saveReport;
 $('reset').onclick=reset;$('clear').onclick=reset;
 $('download').onclick=()=>{if(!report)return;const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='onam-formu.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 window.addEventListener('pagehide',()=>{clearReceipt();phase='idle';answerDraft='';abortMic();answers={};report=null;receiptKey=null;candidate='';confirmationText='';confirmationParts=undefined;$('answer').value='';$('summary').textContent='';$('status').textContent='';$('work').hidden=true;$('result').hidden=true;$('start').hidden=false});
})();
