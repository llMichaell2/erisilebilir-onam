(() => {
 'use strict';
 const $=id=>document.getElementById('qa-'+id);
 const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
 const questions=[
  {key:'name',label:'Ad soyad',prompt:'Adınız ve soyadınız nedir? Deneme için hayali bir ad söyleyin.',validate:v=>v.trim().length>=3?'':'Lütfen en az üç karakterlik bir ad soyad girin.'},
  {key:'birthDate',label:'Doğum tarihi',prompt:'Doğum tarihiniz nedir? Gün, ay ve yıl olarak söyleyebilirsiniz. Bu soruyu atlayabilirsiniz.',optional:true},
  {key:'phone',label:'Telefon',prompt:'Telefon numaranız nedir? Rakamları tek tek söyleyebilirsiniz. Bu soruyu atlayabilirsiniz.',optional:true},
  {key:'listened',label:'Formu dinleme / okuma beyanı',prompt:'Formun altı bölümünü dinlediniz veya okudunuz mu? Evet ya da hayır deyin.',binary:true},
  {key:'understood',label:'Anlama beyanı',prompt:'Bilgileri anladınız mı, yoksa bir sağlık çalışanına soru sormak mı istiyorsunuz? Evet veya hayır deyin. Hayır cevabında sağlık ekibinden açıklama isteyin.',binary:true}
 ];
 let step=0,phase='idle',answers={},candidate='',recognition=null,generation=0,report=null;
 const normalize=v=>v.toLocaleLowerCase('tr-TR').replace(/[.,!?]/g,'').trim();
 const yes=v=>['evet','doğru','evet doğru'].includes(normalize(v));
 const no=v=>['hayır','yanlış','hayır yanlış'].includes(normalize(v));
 function abortMic(){generation++;if(recognition){const old=recognition;recognition=null;old.abort()}$('listen').disabled=!Recognition||!['answer','confirm'].includes(phase)}
 window.addEventListener('onam-stop',()=>{const listening=!!recognition;abortMic();if(listening)$('status').textContent='Mikrofon durduruldu. Tekrar deneyebilir veya yazabilirsiniz.'});
 function say(message){window.onamAudio.stop();window.onamAudio.speak(message)}
 function controls(){
  const confirm=phase==='confirm';
  $('confirm').hidden=!confirm;$('correct').hidden=!confirm;
  $('submit').hidden=confirm;$('answer').readOnly=confirm;
  $('skip').hidden=confirm||!questions[step]?.optional;
  $('listen').disabled=!Recognition;
  $('listen').textContent=confirm?'Mikrofonla evet / hayır de':'Mikrofonla cevap ver';
 }
 function ask(){
  phase='answer';candidate='';$('answer').value='';
  $('question').textContent=`Soru ${step+1} / ${questions.length}: ${questions[step].prompt}`;
  $('status').textContent=Recognition?'Soruyu dinledikten sonra mikrofon düğmesine basın veya cevabınızı yazın.':'Bu tarayıcıda sesli cevap desteklenmiyor. Cevabınızı yazabilirsiniz.';
  controls();$('question').focus();say(questions[step].prompt);
 }
 function submit(value){
  if(phase!=='answer')return;
  const q=questions[step];value=value.trim();
  if(!value){$('status').textContent='Cevap alınamadı. Tekrar konuşabilir veya yazabilirsiniz.';return}
  if(q.binary){if(yes(value))value='Evet';else if(no(value)||['anlamadım','soru sormak istiyorum'].includes(normalize(value)))value='Hayır';else{$('status').textContent='Cevap net değil. Evet veya hayır deyin ya da yazın.';say($('status').textContent);return}}
  if(q.validate&&q.validate(value)){$('status').textContent=q.validate(value);return}
  candidate=value;$('answer').value=value;phase='confirm';controls();
  const message=`${q.label} için cevabınız: ${value}. Doğru mu? Evet, doğru veya hayır, düzelteceğim diyebilirsiniz.`;
  $('status').textContent=message;say(message);
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
  const needsHelp=answers.listened?.value!=='Evet'||answers.understood?.value!=='Evet';
  $('summary').textContent=questions.map(q=>`${q.label}: ${answers[q.key]?.value||'Atlandı'}`).join('\n')+'\n\n'+(needsHelp?'Sağlık çalışanından açıklama / yardım istenmeli.':'Deneme tamamlandı. Bu cevaplar tıbbi onam yerine geçmez.');
  $('download').focus();say(needsHelp?'Deneme tamamlandı. Devam etmeden önce sağlık çalışanından açıklama veya yardım isteyin.':'Deneme tamamlandı. Cevaplarınız yalnızca bu sayfada tutuluyor.');
 }
 function reset(){
  phase='idle';window.onamAudio.stop();answers={};candidate='';report=null;step=0;
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
   if(phase==='confirm'){if(yes(value))confirm();else if(no(value))correct();else{$('status').textContent='Onay anlaşılmadı. Evet, doğru veya hayır, düzelteceğim düğmesini kullanın.';say($('status').textContent)}}
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
 $('submit').onclick=()=>submit($('answer').value);
 $('answer').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();submit($('answer').value)}};
 $('confirm').onclick=confirm;$('correct').onclick=correct;$('listen').onclick=listen;
 $('repeat').onclick=()=>say(phase==='confirm'?$('status').textContent:questions[step].prompt);
 $('skip').onclick=()=>{if(phase!=='answer'||!questions[step].optional)return;abortMic();step++;ask()};
 $('reset').onclick=reset;$('clear').onclick=reset;
 $('download').onclick=()=>{if(!report)return;const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='onam-deneme-ozeti.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 window.addEventListener('pagehide',()=>{phase='idle';abortMic();answers={};report=null;candidate='';$('answer').value='';$('summary').textContent='';$('status').textContent='';$('work').hidden=true;$('result').hidden=true;$('start').hidden=false});
})();
