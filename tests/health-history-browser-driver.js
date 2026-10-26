
(async()=>{
 const $=id=>document.getElementById('qa-'+id),assert=(condition,message)=>{if(!condition)throw Error(message)};
 window.trace=[];const click=id=>{$(id).click();window.trace.push({id,question:$('question').textContent,status:$('status').textContent,value:$('answer').value})},type=value=>{$('answer').value=value;click('submit')},voice=value=>{window.audioDone?.();window.testMic.onresult({results:[Object.assign([{transcript:value}],{isFinal:true})]})};
 click('start');for(const value of ['Öykü Işıl Çığ Şener','10000000146','05.10.2005','05381234567']){type(value);click('confirm')}
 assert($('question').textContent.includes('Sağlık öyküsü 1 / 10'),'First health question');assert(!$('yes').hidden&&!$('no').hidden,'Two choices visible');
 const grace=new URL(location.href).searchParams.get('grace');
 if(grace){
  click('no');window.audioDone?.();
  if(grace==='correction')setTimeout(()=>window.testMic.onresult({results:[Object.assign([{transcript:'hayır'}],{isFinal:true})]}),2000);
  if(grace==='network')setTimeout(()=>window.testMic.onerror({error:'network'}),1000);
  await new Promise(resolve=>setTimeout(resolve,6500));
  assert($('question').textContent.includes('Sağlık öyküsü '+(grace==='auto'?2:1)+' / 10'),'Grace result');
  if(grace==='network')assert(!$('confirm').hidden,'Network does not auto approve');
  document.title='HEALTH GRACE PASS';document.getElementById('test-output').textContent=JSON.stringify({pass:true,grace});return;
 }
 if(new URL(location.href).searchParams.has('preview')){document.title='HEALTH PREVIEW';return}
 const modes=['Hayır','Evet','Bilmiyorum','Evet','Hayır','Bilmiyorum','Evet','Evet','Hayır','Bilmiyorum'];
 for(let i=0;i<10;i++){
  assert($('question').textContent.includes('Sağlık öyküsü '+(i+1)+' / 10'),'Question '+i);
  if(modes[i]==='Bilmiyorum')voice('bilmiyorum');else click(modes[i]==='Evet'?'yes':'no');
  assert(!$('confirm').hidden,'Readback confirmation');assert($('answer').value===modes[i],'Exact answer');click('confirm');
  if(modes[i]==='Evet'&&i<9){assert($('question').textContent.includes('Açıklama'),'Follow up');type(i===1?'Daha önce döküntü oldu.':'Test açıklaması');click('confirm')}
 }
 assert($('question').textContent.includes('Son beyan'),'Final declaration');
 type('Okudum anladım onaylıyorum');click('confirm');for(let i=0;i<8;i++)await Promise.resolve();
 assert(!$('result').hidden,'Complete screen');assert(window.savedReport.answers.declaration.healthHistory.items.length===10,'All 10 saved');assert(Object.keys(window.savedReport.answers).length===6,'Compatible API shape');assert(window.savedReport.answers.declaration.healthHistory.items[2].answer==='Bilmiyorum','Unknown retained');
 OnamHealth.render(document.getElementById('test-health'),window.savedReport.answers.declaration.healthHistory);assert(document.querySelectorAll('.health-response').length===10,'Doctor display');assert(document.querySelectorAll('.health-choice').length===30,'Three options per question');assert(document.querySelectorAll('.health-choice.is-selected').length===10,'Exactly one selected answer per question');assert([...document.querySelectorAll('.health-choice.is-selected')].filter(el=>el.textContent.includes('Bilmiyorum')).length===3,'Unknown ticks preserved');
 const hostile=structuredClone(window.savedReport.answers.declaration.healthHistory);hostile.items[1].detail='<img src=x onerror=alert(1)>';OnamHealth.render(document.getElementById('test-health'),hostile);assert(!document.querySelector('#test-health img'),'Unsafe text not interpreted as HTML');
 document.title='HEALTH TEST PASS';document.getElementById('test-output').textContent=JSON.stringify({pass:true,report:window.savedReport});
})().catch(error=>{document.title='HEALTH TEST FAIL';document.getElementById('test-output').textContent=JSON.stringify({pass:false,error:error.message,stack:error.stack,trace:window.trace,errors:window.testErrors})});
