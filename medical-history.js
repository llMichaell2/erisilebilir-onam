(() => {
 'use strict';
 const version='health-history-v1';
 const definitions=[
  {id:'previous_imaging',label:'Önceki görüntüleme',prompt:'Daha önce MR veya bilgisayarlı tomografi çekildiniz mi?',follow:'Hangi işlem yapıldı? Bir sorun yaşadıysanız açıklayın; yaşamadıysanız sorun yaşamadım deyin.'},
  {id:'contrast',label:'Kontrast madde öyküsü',prompt:'Daha önce kontrast madde, yani görüntüleme için kullanılan ilaç verildi mi?',follow:'Kontrast madde sonrasında alerji veya başka bir sorun oldu mu? Varsa açıklayın; olmadıysa sorun olmadı deyin.'},
  {id:'allergy_asthma',label:'Alerji ve astım',prompt:'Bilinen bir alerjiniz, astımınız veya ciddi alerjik reaksiyon geçmişiniz var mı?',follow:'Hangisi var? Alerjiniz varsa neye karşı ve nasıl bir tepki olduğunu açıklayın.'},
  {id:'medicines',label:'Kullanılan ilaçlar',prompt:'Sürekli veya yakın zamanda kullandığınız ilaç var mı?',follow:'İsimlerini biliyorsanız söyleyin. Şeker hastalığı için kullandığınız ilaçları da belirtin.'},
  {id:'kidney',label:'Böbrek hastalığı ve tedavisi',prompt:'Böbrek hastalığınız, böbrek nakliniz veya diyaliz tedaviniz var mı?',follow:'Hangisi olduğunu açıklayabilir misiniz?'},
  {id:'other_conditions',label:'Diğer hastalıklar',prompt:'Size tanı konmuş başka bir hastalık var mı? Kalp, tansiyon, şeker, tiroit, karaciğer, kan hastalığı veya epilepsi gibi.',follow:'Hangi hastalığınız olduğunu açıklayın.'},
  {id:'surgery_injury',label:'Ameliyat ve kaza öyküsü',prompt:'Daha önce ameliyat veya önemli bir kaza geçirdiniz mi?',follow:'Hangi bölgeden ve yaklaşık ne zaman olduğunu söyleyin.'},
  {id:'implants',label:'Tıbbi cihaz ve metal implant',prompt:'Vücudunuzda tıbbi cihaz, implant veya metal parça var mı? Kalp pili, işitme implantı, pompa, protez, plaka veya vida gibi.',follow:'Cihazın veya metal parçanın türünü ve bulunduğu yeri biliyorsanız açıklayın.'},
  {id:'foreign_body',label:'Metal veya yabancı cisimle yaralanma',prompt:'Gözünüzde veya vücudunuzda metal ya da yabancı cisimle yaralanma oldu mu?',follow:'Nerede olduğunu ve parçanın çıkarılıp çıkarılmadığını biliyorsanız açıklayın.'},
  {id:'pregnancy',label:'Gebelik veya gebelik ihtimali',prompt:'Gebeliğiniz veya gebe olma ihtimaliniz var mı?'}
 ];
 const normalize=value=>String(value).toLocaleLowerCase('tr-TR').normalize('NFC').replace(/[.,!?;:]/g,' ').replace(/\s+/g,' ').trim();
 function parseAnswer(value){const words=normalize(value).split(' ');if(words.every(word=>word==='evet'))return 'Evet';if(words.every(word=>word==='hayır'))return 'Hayır';if(words.every(word=>word==='bilmiyorum'))return 'Bilmiyorum';return ''}
 const detailError=value=>!value.trim()?'Kısa bir açıklama söyleyin veya yazın. Açıklamayı bilmiyorsanız bilmiyorum diyebilirsiniz.':value.length>120||new TextEncoder().encode(value).length>180?'Açıklamanızı biraz daha kısa söyleyin veya yazın. Ayrıntıları sağlık çalışanınıza iletebilirsiniz.':'';
 function snapshot(answers){
  return {version,items:definitions.map(q=>{const response=answers['history_'+q.id],answer=response?.value;if(!['Evet','Hayır','Bilmiyorum'].includes(answer))throw Error('Sağlık öyküsü soruları tamamlanmadı.');const item={id:q.id,answer};if(answer==='Evet'&&q.follow){const detail=answers['detail_'+q.id]?.value||'';if(detailError(detail))throw Error('Sağlık öyküsü açıklaması tamamlanmadı.');item.detail=detail}return item})};
 }
 function entries(history){
  if(!history)return [];
  if(history.version!==version||!Array.isArray(history.items))return null;
  return definitions.map(q=>{const matches=history.items.filter(item=>item?.id===q.id);const item=matches.length===1?matches[0]:null;return {label:q.label,prompt:q.prompt,answer:['Evet','Hayır','Bilmiyorum'].includes(item?.answer)?item.answer:'Yanıt bulunamadı',detail:item?.answer==='Evet'&&typeof item.detail==='string'?item.detail:''}});
 }
 function render(target,history){
  target.replaceChildren();if(!history)return false;
  const rows=entries(history);
  if(!rows){const note=document.createElement('p');note.textContent='Bu sağlık öyküsünün sürümü desteklenmiyor. Personel değerlendirmesi gerekir.';target.append(note);return true}
  rows.forEach((row,index)=>{const article=document.createElement('div'),heading=document.createElement('h3'),answer=document.createElement('p');article.className='health-response';heading.textContent=(index+1)+'. '+row.prompt;answer.textContent='Yanıt: '+row.answer;article.append(heading,answer);if(row.detail){const detail=document.createElement('p');detail.textContent='Açıklama: '+row.detail;article.append(detail)}target.append(article)});return true;
 }
 window.OnamHealth=Object.freeze({version,definitions,parseAnswer,detailError,snapshot,entries,render});
})();