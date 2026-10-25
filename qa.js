(() => {
 'use strict';
 const $=id=>document.getElementById('qa-'+id);
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 const V=window.OnamValidation;
 window.onamMicActive=()=>!!recognition||restartTimer!==null;
 const declaration='Onam formunu okudum, anladım, onaylıyorum';
 const questions=[
  {key:'name',label:'Ad soyad',clean:v=>v.normalize('NFC').replace(/[.,!?…:;]+/g,' ').replace(/\s+/g,' ').trim(),error:'Ad ve soyadı birlikte girin.',prompt:'Adınız ve soyadınız nedir? Cevabınız bitince tamam deyin.',validate:v=>/^[\p{L}]+(?:[’' -][\p{L}]+)*\s[\p{L}]+(?:[’' -][\p{L}]+)*$/u.test(v)?'':'Ad ve soyadı birlikte girin.'},
  {key:'tc',label:'T.C. kimlik numarası',prompt:'On bir haneli T.C. kimlik numaranız nedir? Rakamları tek tek söyleyin.',clean:V.tc,error:'T.C. kimlik numarası on bir haneli olmalı ve kontrol basamakları geçerli olmalıdır. Bu kontrol kimliğinizi doğrulamaz.'},
  {key:'birthDate',label:'Doğum tarihi',prompt:'Doğum tarihiniz nedir? Örneğin beş ekim iki bin beş. Duraksayabilirsiniz. Tarihin tamamını söyledikten sonra tamam deyin.',clean:V.birth,error:'Geçerli bir doğum tarihi girin. Örnek biçim: 15.06.1990. Gelecek tarih kabul edilmez.'},
  {key:'phone',label:'Telefon',prompt:'Telefon numaranız nedir? Rakamları tek tek söyleyin veya başında sıfırla yazın.',clean:V.phone,error:'Geçerli bir Türkiye telefon numarası girin. Başında sıfırla on bir rakam olmalıdır.'},
  {key:'dateTime',label:'Tarih ve saat',prompt:'Tarih ve saat cihazınızdan otomatik alınır. Kabul etmek için tamam deyin. Değiştirmek için tarihi, saat ve dakika diyerek zamanı söyleyin; bitince tamam deyin.',clean:V.dateTime,error:'Geçerli tarih ve saat girin. Örnek biçim: 24.10.2026 14:30.'},
  {key:'declaration',label:'Son beyan',prompt:'Beyanınız için şunu söyleyin veya yazın: Okudum, anladım, onaylıyorum.',final:true}
 ];
 let editingDate=false,step=0,phase='idle',answers={},candidate='',recognition=null,generation=0,report=null,receiptKey=null,saveGeneration=0,confirmationText='',confirmationParts,questionSpeech='',spokenDeclaration='',pdfGeneration=0,pdfBusy=false;
 const normalize=v=>v.toLocaleLowerCase('tr-TR').replace(/[.,!?]/g,' ').replace(/\s+/g,' ').trim();
 const yes=v=>['evet','tamam','doğru','evet doğru','bilgilerim doğru'].includes(normalize(v));
 const matchesDeclaration=v=>[declaration,'Onan formunu okudum, anladım, onaylıyorum','Okudum, anladım, onaylıyorum'].some(text=>normalize(text)===normalize(v));
 const finishApproval=v=>['beyanımı tamamla','onaylıyorum'].includes(normalize(v))||matchesDeclaration(v);
 const no=v=>['hayır','yanlış','hayır yanlış','düzelteceğim'].includes(normalize(v));
 let micTimeout=null,restartTimer=null,answerDraft='';
 const collectingAnswer=()=>phase==='answer';
 const spokenDigits=value=>value.toLocaleLowerCase('tr-TR').split(/[\s,;.:()＋+–—-]+/).map(w=>({sıfır:'0',bir:'1',iki:'2',üç:'3',dört:'4',beş:'5',altı:'6',yedi:'7',sekiz:'8',dokuz:'9'}[w]??w)).join('');
 function abortMic(){clearTimeout(micTimeout);clearTimeout(restartTimer);restartTimer=null;generation++;if(recognition){const old=recognition;recognition=null;old.abort()}$('listen').disabled=!Recognition||!['answer','confirm'].includes(phase)}
 window.addEventListener('onam-stop',()=>{const listening=!!recognition||restartTimer!==null;abortMic();if(listening)$('status').textContent='Mikrofon durduruldu. Tekrar deneyebilir veya yazabilirsiniz.'});
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
  let autoDate=false;
  if(questions[step].key==='dateTime'&&!editingDate){answers.dateTime={value:V.dateTime(V.localNow()),confirmedAt:new Date().toISOString(),source:'device'};step++;autoDate=true}
  phase='answer';answerDraft='';candidate='';spokenDeclaration='';confirmationText='';confirmationParts=undefined;$('answer').value=questions[step].key==='dateTime'?V.dateTime(V.localNow()):'';
  const q=questions[step];
  $('date-info').hidden=!answers.dateTime||editingDate;
  $('date-value').textContent=answers.dateTime?.value||'';
  const answerLabel=document.getElementById('qa-answer-label');if(answerLabel)answerLabel.textContent=q.label+' — cevabınız';
  questionSpeech=q.key==='dateTime'?'Tarih ve saat düzeltme. Yeni tarih ve saati söyleyip tamam deyin veya yazın. Mevcut değeri korumak için tamam diyebilirsiniz.':(autoDate?'Tarih ve saat otomatik kaydedildi. ':'')+q.prompt;
  $('question').textContent=`${editingDate?'Tarih ve saat düzeltme':'Soru '+(step===5?5:step+1)+' / 5'}: ${q.prompt}${q.key==='dateTime'?' Önerilen: '+$('answer').value:''}`;
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
   if(!matchesDeclaration(value)){
    const refusal=/onaylamıyorum|kabul etmiyorum|anlamadım|hayır/.test(normalize(value));
    $('status').textContent=refusal?'Onay vermediniz. Beyan tamamlanmadı.':'Beyan tamamlanmadı. Kabul ediyorsanız okudum, anladım, onaylıyorum deyin.';
    say($('status').textContent);return;
   }spokenDeclaration=value;value=declaration;
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
  abortMic();answers[questions[step].key]={value:candidate,...(questions[step].final?{spokenDeclaration}:{}),confirmedAt:new Date().toISOString()};
  editingDate=false;step++;if(step<questions.length)ask();else finish();
 }
 function correct(){if(phase!=='confirm')return;abortMic();ask();$('answer').focus()}
 function finish(){
  phase='done';window.onamAudio.stop();$('work').hidden=true;$('result').hidden=false;
  receiptKey=window.OnamRecords.createKey();
  report={type:'patient-declaration',submissionId:crypto.randomUUID(),formVersion:'bt-mr-photo-v1',completedAt:new Date().toISOString(),answers,formSnapshot:(window.onamFormSnapshot||[]).map(section=>({...section})),identityVerified:false,clinicalConsentRecorded:false};
  const complete=questions.every(q=>answers[q.key]?.value);
  if(!complete)throw new Error('Zorunlu alan eksik');
  $('summary').textContent=questions.map(q=>`${q.label}: ${answers[q.key].value}`).join('\n');
  $('download').focus();say('Son beyanınız alındı. İşlem tamamlandı. Geçmiş olsun. Sağlıklı günler dileriz.');saveReport();
 }
 async function saveReport(){
  if(!report)return;
  const token=++saveGeneration;const currentReport=report;
  $('save-retry').hidden=true;$('receipt').hidden=true;$('download').disabled=true;$('save-status').textContent='Form sisteme gönderiliyor…';
  try{
   const id=await window.OnamRecords.submit(currentReport,receiptKey);
   if(token!==saveGeneration||report!==currentReport)return;
   const url=window.OnamRecords.recordUrl(receiptKey);currentReport.recordId=id;currentReport.recordUrl=url;
   $('save-status').textContent='Form kaydedildi. QR kodu indirebilir ve sağlık çalışanınızla paylaşabilirsiniz.';
   window.OnamQR.render($('qr'),url);
   $('record-link').href=url;$('receipt').hidden=false;
  }catch(error){if(token!==saveGeneration||report!==currentReport)return;$('save-status').textContent=error.message;$('save-retry').hidden=!window.OnamRecords.configured}finally{if(token===saveGeneration&&report===currentReport)$('download').disabled=pdfBusy}
 }
 function clearReceipt(){saveGeneration++;pdfGeneration++;pdfBusy=false;$('pdf-status').textContent='';$('download').disabled=false;$('qr').replaceChildren();$('receipt').hidden=true;$('record-link').removeAttribute('href');$('save-status').textContent='';$('save-retry').hidden=true}
 function reset(){
  editingDate=false;$('date-info').hidden=true;
  abortMic();clearReceipt();phase='idle';answerDraft='';window.onamAudio.stop();answers={};candidate='';spokenDeclaration='';report=null;receiptKey=null;step=0;confirmationText='';confirmationParts=undefined;
  $('answer').value='';$('summary').textContent='';$('status').textContent='';$('question').textContent='';
  $('work').hidden=true;$('result').hidden=true;$('start').hidden=false;$('start').focus();
 }
 function listen(recovery){
  if(!Recognition||!['answer','confirm'].includes(phase))return;
  abortMic();window.onamAudio.stop();
  const token=generation;const expectedPhase=phase;const expectedStep=step;
  const budget=recovery&&typeof recovery.startedAt==='number'?recovery:{startedAt:Date.now(),attempts:0};
  const limit=phase==='answer'?120000:25000;
  const rec=new Recognition();recognition=rec;rec.lang='tr-TR';rec.continuous=collectingAnswer();rec.interimResults=true;rec.maxAlternatives=1;
  let resultReceived=false,failed=false,ended=false,pending='';
  const collectMode=collectingAnswer(),q=questions[step];let prefix=collectMode?answerDraft:'',resultOffset=0;
  $('listen').disabled=false;$('listen').textContent='Mikrofonu yeniden başlat';$('status').textContent='Mikrofon açılıyor. İzin istenirse izin verin.';
  rec.onstart=()=>{if(token===generation&&!ended)$('status').textContent=answerDraft?'Dinliyorum. Söyledikleriniz korundu. Kaldığınız yerden devam edin; bitince tamam deyin.':'Dinliyorum. Şimdi konuşabilirsiniz.'};
  function acceptTranscript(value){
   if(token!==generation||phase!==expectedPhase||step!==expectedStep)return;
   if(!value.trim())return;resultReceived=true;
   // End recognition before playing the confirmation, preventing microphone echo.
   abortMic();
   if(phase==='confirm'){if(questions[step].final?finishApproval(value):yes(value))confirm();else if(no(value))correct();else{$('status').textContent=questions[step].final?'Beyan tamamlanmadı. Bitirmek istiyorsanız beyanımı tamamla veya onaylıyorum deyin.':'Doğrulama anlaşılmadı. Ekrandaki doğrula veya düzelt düğmesini kullanabilirsiniz.';say($('status').textContent)}}
   else{submit(value)}
  }
  rec.onresult=e=>{
   if(token!==generation||ended||phase!==expectedPhase||step!==expectedStep)return;
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
     if(matchesDeclaration(value)||yes(value)||/onaylamıyorum|kabul etmiyorum|anlamadım|hayır/.test(normalize(value)))acceptTranscript(value);
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
   if(token!==generation||ended)return;
   if(e.error==='no-speech'){$('status').textContent='Ses duyulmadı. Dinleme yeniden açılacak; yazıyla da devam edebilirsiniz.';return}
   failed=true;abortMic();
   const messages={'not-allowed':'Mikrofon izni verilmedi. Chrome site ayarlarından izin verebilir veya cevabınızı yazabilirsiniz.','service-not-allowed':'Konuşma tanıma hizmeti kullanılamıyor. Yazıyla devam edebilirsiniz.','audio-capture':'Mikrofon bulunamadı. Bağlantıyı kontrol edin veya yazıyla devam edin.','no-speech':'Ses duyulmadı. Tekrar deneyin veya cevabınızı yazın.','network':'Konuşma tanıma hizmetine ulaşılamadı. İnterneti kontrol edin veya yazıyla devam edin.','aborted':'Mikrofon durduruldu.'};
   $('status').textContent=messages[e.error]||'Sesli cevap alınamadı. Tekrar deneyin veya yazıyla devam edin.';
  };
  rec.onend=()=>{
   if(token!==generation||ended)return;ended=true;clearTimeout(micTimeout);recognition=null;
   // Never interpret an interim result as an approval when the service disconnects.
   if(collectMode&&pending){answerDraft=pending.replace(/(?:^|\s)(?:cevabım bitti|tamam|bitti)[.,!?]*$/iu,'').trim();$('answer').value=answerDraft}
   $('listen').disabled=false;
   const recover=!failed&&!resultReceived&&$('auto').checked&&!window.onamSilent&&!document.hidden&&budget.attempts<3&&Date.now()-budget.startedAt<limit;
   if(recover){
    $('status').textContent=(answerDraft?'Söyledikleriniz korundu. ':'')+'Dinleme yeniden açılıyor. Kaldığınız yerden konuşabilir veya yazabilirsiniz.';
    restartTimer=setTimeout(()=>{
     restartTimer=null;
     if(token!==generation||phase!==expectedPhase||step!==expectedStep||document.hidden||!$('auto').checked||window.onamSilent)return;
     if(Date.now()-budget.startedAt>=limit){$('status').textContent='Dinleme süresi doldu. Söyledikleriniz korundu. Mikrofon düğmesiyle veya yazıyla devam edebilirsiniz.';return}
     listen({startedAt:budget.startedAt,attempts:budget.attempts+1});
    },600);return;
   }
   if(!resultReceived&&!failed){$('listen').textContent='Mikrofonla devam et';$('status').textContent=(answerDraft?'Söyledikleriniz korundu. ':'')+'Dinleme sona erdi. Mikrofon düğmesiyle devam edebilir veya yazabilirsiniz.'}
  };
  try{rec.start();micTimeout=setTimeout(()=>{
   if(token!==generation)return;
   abortMic();$('status').textContent='Konuşma tanıma sonucu gelmedi. Mikrofonla cevap ver düğmesiyle tekrar deneyin. Telefonun mikrofon iznini ve sesle yazma ayarlarını kontrol edin veya yazıyla devam edin.';
  },Math.max(1,limit-(Date.now()-budget.startedAt)))}catch{abortMic();$('listen').disabled=false;$('status').textContent='Mikrofon başlatılamadı. Tekrar deneyin veya yazıyla devam edin.'}
 }
 $('start').onclick=()=>{reset();$('start').hidden=true;$('work').hidden=false;ask()};
 $('open').onclick=()=>{if(phase==='idle')$('start').click();document.getElementById('qa-panel').scrollIntoView({block:'start'})};
 $('submit').onclick=()=>submit($('answer').value);
 $('answer').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();submit($('answer').value)}};
 $('auto').disabled=!Recognition;
 $('auto').onchange=()=>{if(!$('auto').checked)abortMic()};
 $('answer').oninput=()=>{answerDraft=$('answer').value.trim();abortMic()};
 document.addEventListener('visibilitychange',()=>{if(document.hidden)abortMic()});
 $('date-edit').onclick=()=>{if(!['answer','confirm'].includes(phase)||!answers.dateTime)return;abortMic();editingDate=true;step=4;ask();$('answer').value=answers.dateTime.value};
 $('confirm').onclick=confirm;$('correct').onclick=correct;$('listen').onclick=listen;
 $('repeat').onclick=()=>say(phase==='confirm'?confirmationText:questionSpeech,phase==='confirm'?confirmationParts:undefined);
 $('qr-download').onclick=()=>window.OnamQR.download($('qr')).catch(()=>{$('save-status').textContent='QR indirilemedi. Tekrar deneyin.'});
 $('save-retry').onclick=saveReport;
 $('reset').onclick=reset;$('clear').onclick=reset;
 $('download').onclick=async()=>{
  if(!report||pdfBusy)return;const currentReport=report,token=++pdfGeneration;pdfBusy=true;$('download').disabled=true;$('pdf-status').textContent='PDF hazırlanıyor…';
  try{
   const blob=await window.OnamPDF.create(structuredClone(currentReport));
   if(token!==pdfGeneration||report!==currentReport)return;
   const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='onam-formu.pdf';link.style.display='none';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
   $('pdf-status').textContent='PDF oluşturuldu. Tarayıcınızın indirmelerinden açabilirsiniz.';
  }catch(error){if(token===pdfGeneration&&report===currentReport)$('pdf-status').textContent=error.message||'PDF oluşturulamadı. Yeniden deneyin.'}
  finally{if(token===pdfGeneration&&report===currentReport){pdfBusy=false;$('download').disabled=false}}
 };
 window.addEventListener('pagehide',()=>{clearReceipt();phase='idle';answerDraft='';abortMic();answers={};report=null;receiptKey=null;candidate='';spokenDeclaration='';confirmationText='';confirmationParts=undefined;$('answer').value='';$('summary').textContent='';$('status').textContent='';$('work').hidden=true;$('result').hidden=true;$('start').hidden=false});
})();
