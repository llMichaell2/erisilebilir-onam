(() => {
 const $=id=>document.getElementById(id);const api=window.OnamRecords;let token=null,generation=0;
 const labels={name:'Ad soyad',tc:'T.C. kimlik numarası',birthDate:'Doğum tarihi',phone:'Telefon',dateTime:'Tarih / saat',declaration:'Hasta beyanı'};
 const idFromUrl=()=>new URLSearchParams(location.hash.slice(1)).get('record');
 const status=message=>$('doctor-status').textContent=message;
 function clear(){generation++;$('record-panel').hidden=true;$('records-panel').hidden=true;$('record-details').replaceChildren();$('record-form').replaceChildren();$('records-list').replaceChildren()}
 async function showRecord(){
  if(!token)return;const id=idFromUrl();if(!id)return;
  const current=++generation;$('record-panel').hidden=true;$('record-details').replaceChildren();$('record-form').replaceChildren();status('Form yükleniyor…');
  try{const record=await api.get(id,token);if(current!==generation)return;
   for(const [key,label] of Object.entries(labels)){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=record.answers[key]?.value||'—';$('record-details').append(dt,dd)}
   for(const [label,value] of [['Kayıt zamanı',new Date(record.created_at).toLocaleString('tr-TR')],['Form sürümü',record.form_version],['Kayıt numarası',record.id]]){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('record-details').append(dt,dd)}
   for(const section of record.form_snapshot){const h=document.createElement('h3'),p=document.createElement('p');h.textContent=section.title;p.textContent=section.text;p.className='form-text';$('record-form').append(h,p)}
   $('record-panel').hidden=false;status('Form açıldı.');
  }catch(error){if(current===generation)status(error.message)}
 }
 async function list(){
  if(!token)return;const current=generation;
  try{const rows=await api.list(token);if(current!==generation)return;$('records-list').replaceChildren();
   for(const row of rows){const a=document.createElement('a');a.href='#record='+row.id;a.textContent=new Date(row.created_at).toLocaleString('tr-TR')+' · '+row.form_version;a.onclick=()=>{if(idFromUrl()===row.id)showRecord()};$('records-list').append(a)}
   if(!rows.length)$('records-list').textContent='Görüntülenebilen kayıt yok. Doktor yetkisini kontrol edin.';
   $('records-panel').hidden=false;
  }catch(error){if(current===generation)status(error.message)}
 }
 $('login-form').onsubmit=async event=>{event.preventDefault();$('login-button').disabled=true;const requestGeneration=generation;const email=$('email').value,password=$('password').value;$('password').value='';status('Giriş yapılıyor…');
  try{const access=await api.login(email,password);if(requestGeneration!==generation)return;token=access;$('login').hidden=true;$('toolbar').hidden=false;status('Giriş yapıldı.');await list();await showRecord()}catch(error){token=null;clear();status(error.message)}finally{$('login-button').disabled=false}
 };
 $('logout').onclick=()=>{const old=token;token=null;clear();$('toolbar').hidden=true;$('login').hidden=false;$('email').value='';status('Çıkış yapıldı.');if(old)api.logout(old).catch(()=>{})};
 $('refresh-records').onclick=async()=>{await list();await showRecord()};$('print-record').onclick=()=>window.print();window.addEventListener('hashchange',showRecord);
 window.addEventListener('pagehide',()=>{token=null;clear();$('password').value='';$('login').hidden=false;$('toolbar').hidden=true});
 status(api.configured?(idFromUrl()?'QR kaydını açmak için doktor hesabınızla giriş yapın.':'Doktor hesabınızla giriş yapın.'):'Kayıt bağlantısı henüz ayarlanmadı.');
})();
