(() => {
 const $=id=>document.getElementById(id),api=window.OnamRecords;
 let session=null,generation=0,busy=false,timer=null,records=[],refreshing=null;
 const normal=value=>value.toLocaleLowerCase('tr-TR').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ı/g,'i');
 function status(text){$('status').textContent=text}
 function close(){generation++;session=null;records=[];busy=false;refreshing=null;clearInterval(timer);timer=null;$('record-list').replaceChildren();$('dashboard').hidden=true;$('login').hidden=false;$('password').value='';$('email').value='';$('search').value='';$('login-button').disabled=false}
 function render(){
  const filtered=records.filter(record=>normal(record.patient_name).includes(normal($('search').value.trim())));
  $('stat-total').textContent=records.length;$('stat-today').textContent=records.filter(r=>new Date(r.created_at).toDateString()===new Date().toDateString()).length;$('stat-visible').textContent=filtered.length;$('record-list').replaceChildren();
  if(!filtered.length){const empty=document.createElement('p');empty.className='empty-state';empty.textContent=records.length?'Bu aramaya uygun hasta bulunamadı.':'Henüz onaylanan form yok. Yeni formlar burada görünecek.';$('record-list').append(empty)}
  for(const record of filtered){const card=document.createElement('article');card.className='record-card';const pill=document.createElement('span');pill.className='pill';pill.textContent=record.access_token?'Beyan kaydedildi':'Erişim kapalı';const title=document.createElement('h3');title.className='patient-name';title.textContent=record.patient_name;const time=document.createElement('p');time.className='time';time.textContent=new Date(record.created_at).toLocaleString('tr-TR');card.append(pill,title,time);
   if(api.isKey(record.access_token)){const url=api.recordUrl(record.access_token);const qr=document.createElement('div');qr.className='qr';qr.setAttribute('role','img');qr.setAttribute('aria-label',record.patient_name+' için form QR kodu');window.OnamQR.render(qr,url);const actions=document.createElement('div');actions.className='card-actions';const link=document.createElement('a');link.className='button primary';link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent='Formu görüntüle';const download=document.createElement('button');download.textContent='QR indir';download.onclick=()=>window.OnamQR.download(qr).catch(()=>status('QR indirilemedi.'));const print=document.createElement('button');print.textContent='Etiket yazdır';print.onclick=()=>{document.querySelectorAll('.print-target').forEach(el=>el.classList.remove('print-target'));card.classList.add('print-target');window.print()};actions.append(link,download,print);card.append(qr,actions)}
   $('record-list').append(card);
  }
 }
 async function accessToken(){
  if(!session)throw Error('Oturum kapandı.');
  if(session.expires_at*1000<Date.now()+60000){
   if(!refreshing){const old=session;refreshing=api.refreshSession(old.refresh_token).then(next=>{if(session===old)session=next;return next}).finally(()=>{refreshing=null})}
   await refreshing;
  }
  if(!session?.access_token)throw Error('Oturum kapandı.');return session.access_token;
 }
 async function refresh(){if(!session||busy)return;busy=true;const current=generation;
  try{const token=await accessToken();const next=await api.listAuthenticated(token);if(current!==generation)return;records=next;render();$('login').hidden=true;$('dashboard').hidden=false;status('Kayıtlar güncel. Son kontrol: '+new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}))}catch(error){if(current!==generation)return;const old=session;close();if(old)api.logout(old.access_token).catch(()=>{});status(error.message)}finally{if(current===generation)busy=false}
 }
 $('login-form').onsubmit=async event=>{event.preventDefault();const current=++generation;const email=$('email').value.trim(),password=$('password').value;$('password').value='';$('login-button').disabled=true;status('Hesabınız doğrulanıyor…');
  try{const next=await api.login(email,password);if(current!==generation){api.logout(next.access_token).catch(()=>{});return}session=next;await refresh();if(session)timer=setInterval(()=>{if(!document.hidden)refresh()},15000)}catch(error){if(current===generation){close();status(error.message)}}finally{if(current===generation)$('login-button').disabled=false}
 };
 $('refresh').onclick=refresh;$('search').oninput=render;$('logout').onclick=()=>{const old=session;close();status('Güvenli çıkış yapıldı.');if(old)api.logout(old.access_token).catch(()=>{})};
 window.addEventListener('pagehide',()=>{const old=session;close();if(old)api.logout(old.access_token).catch(()=>{})});
 status(api.configured?'Yönetim hesabınızla giriş yapın.':'Kayıt bağlantısı henüz ayarlanmadı.');
})();
