(() => {
 const $=id=>document.getElementById(id);const api=window.OnamRecords;let key=null,generation=0,timer=null,busy=false;
 function status(text){$('status').textContent=text}
 function close(){generation++;key=null;busy=false;clearInterval(timer);timer=null;$('record-list').replaceChildren();$('login').hidden=false;$('toolbar').hidden=true;$('list-title').hidden=true;$('staff-key').value='';history.replaceState(null,'',location.pathname)}
 function render(records){
  $('record-list').replaceChildren();
  for(const record of records){const article=document.createElement('article');const title=document.createElement('h3');title.className='patient-name';title.textContent=record.patient_name;const time=document.createElement('p');time.className='time';time.textContent=new Date(record.created_at).toLocaleString('tr-TR');article.append(title,time);
   if(api.isKey(record.access_token)){const url=api.recordUrl(record.access_token);const qr=document.createElement('div');qr.className='qr';qr.setAttribute('role','img');qr.setAttribute('aria-label',record.patient_name+' onam formu QR kodu');window.OnamQR.render(qr,url);const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Onaylanan formu aç';const download=document.createElement('button');download.textContent='QR indir';download.onclick=()=>window.OnamQR.download(qr).catch(()=>status('QR indirilemedi.'));const print=document.createElement('button');print.textContent='Ad-soyad ve QR etiketi yazdır';print.onclick=()=>{document.querySelectorAll('.print-target').forEach(el=>el.classList.remove('print-target'));article.classList.add('print-target');window.print()};article.append(qr,link,document.createElement('br'),download,print)}else{const p=document.createElement('p');p.textContent='Bu QR bağlantısının erişimi kapatılmış.';article.append(p)}
   $('record-list').append(article);
  }
 }
 async function refresh(){if(!key||busy)return;busy=true;const current=generation;const active=key;
  try{const records=await api.listByStaffKey(active);if(current!==generation)return;render(records);$('login').hidden=true;$('toolbar').hidden=false;$('list-title').hidden=false;status(records.length?'Kayıt listesi güncel.':'Henüz onaylanan form yok.')}catch(error){if(current!==generation)return;close();status(error.message)}finally{if(current===generation)busy=false}
 }
 async function open(value){close();if(!api.isKey(value)){status('Yönetim anahtarı geçersiz.');return}key=value;history.replaceState(null,'',api.staffUrl(value));status('Kayıtlar yükleniyor…');await refresh();if(key)timer=setInterval(refresh,15000)}
 $('login-form').onsubmit=event=>{event.preventDefault();const value=$('staff-key').value.trim();$('staff-key').value='';open(value)};
 $('refresh').onclick=refresh;$('logout').onclick=()=>{close();status('Ekran kapatıldı.')};$('copy-link').onclick=async()=>{if(!key)return;try{await navigator.clipboard.writeText(api.staffUrl(key));status('Yönetim bağlantısı kopyalandı. Yalnızca yetkili personelle paylaşın.')}catch{status('Bağlantıyı tarayıcının adres çubuğundan kopyalayabilirsiniz.')}};
 const initial=new URLSearchParams(location.hash.slice(1)).get('key');if(initial)open(initial);else status(api.configured?'Özel yönetim bağlantınızla giriş yapın.':'Kayıt bağlantısı henüz ayarlanmadı.');
 window.addEventListener('hashchange',()=>{const value=new URLSearchParams(location.hash.slice(1)).get('key');if(value&&value!==key)open(value)});window.addEventListener('pagehide',close);
})();
