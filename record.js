(() => {
 const $=id=>document.getElementById(id);let generation=0;
 const labels={name:'Ad soyad',tc:'T.C. kimlik numarası',birthDate:'Doğum tarihi',phone:'Telefon',dateTime:'Tarih / saat',declaration:'Hasta onay beyanı'};
 function clear(){generation++;$('record-panel').hidden=true;$('print').hidden=true;$('details').replaceChildren();$('form-text').replaceChildren()}
 async function load(){clear();const current=generation;const key=new URLSearchParams(location.hash.slice(1)).get('key');$('status').textContent='Form yükleniyor…';
  try{const r=await window.OnamRecords.getByKey(key);if(current!==generation)return;
   for(const [label,value] of [...Object.entries(labels).map(([k,label])=>[label,r.answers[k]?.value||'—']),['Sisteme kayıt zamanı',new Date(r.created_at).toLocaleString('tr-TR')],['Form sürümü',r.form_version],['Kayıt numarası',r.id]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;const item=document.createElement('div');item.className='detail-item'+(label==='Hasta onay beyanı'?' wide':'');item.append(dt,dd);$('details').append(item)}
   for(const section of r.form_snapshot){const h=document.createElement('h3'),p=document.createElement('p');h.textContent=section.title;p.textContent=section.text;p.className='form-text';$('form-text').append(h,p)}
   $('record-panel').hidden=false;$('print').hidden=false;$('status').textContent='Hasta formu doldurmuş ve aşağıdaki onay beyanını vermiştir.';
  }catch(error){if(current===generation)$('status').textContent=error.message}
 }
 $('print').onclick=()=>window.print();window.addEventListener('hashchange',load);window.addEventListener('pagehide',clear);window.addEventListener('pageshow',event=>{if(event.persisted)load()});load();
})();
