(() => {
 const config=window.ONAM_CONFIG||{};
 const configured=!!config.supabaseUrl&&!!config.supabaseKey;
 const base=(config.supabaseUrl||'').replace(/\/$/,'');
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 async function request(path,{token,body,method='GET'}={}){
  if(!configured)throw Error('Kayıt bağlantısı henüz ayarlanmadı. Form bu açık sayfada duruyor; özeti indirebilirsiniz.');
  if(!base.startsWith('https://'))throw Error('Kayıt bağlantısı HTTPS kullanmalıdır.');
  const headers={apikey:config.supabaseKey};if(token)headers.Authorization='Bearer '+token;
  if(body)headers['Content-Type']='application/json';
  let response;try{response=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)})}catch{throw Error('Kayıt servisine ulaşılamadı. İnternet bağlantısını kontrol edip tekrar deneyin.')}
  if(!response.ok){if(response.status===401||response.status===403)throw Error('Giriş veya erişim yetkisi doğrulanamadı.');throw Error('İşlem tamamlanamadı. Bilgileri ve kayıt bağlantısını kontrol edin.')}
  if(response.status===204)return null;return response.json();
 }
 window.OnamRecords={configured,isId:value=>uuid.test(value),
  async submit(report){const id=await request('/rest/v1/rpc/submit_consent',{method:'POST',body:{p_submission_id:report.submissionId,p_form_version:report.formVersion,p_answers:report.answers}});if(typeof id!=='string'||!uuid.test(id))throw Error('Kayıt servisi geçerli bir kayıt numarası döndürmedi.');return id},
  doctorUrl(id){if(!uuid.test(id))throw Error('Kayıt numarası geçersiz');const url=new URL('doctor.html',location.href);url.hash='record='+id;return url.href},
  async login(email,password){const session=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});if(!session.access_token)throw Error('Giriş tamamlanamadı');return session.access_token},
  list:token=>request('/rest/v1/consent_records?select=id,created_at,form_version&order=created_at.desc&limit=50',{token}),
  async get(id,token){if(!uuid.test(id))throw Error('Kayıt numarası geçersiz');const rows=await request('/rest/v1/consent_records?id=eq.'+id+'&select=id,created_at,form_version,answers,form_snapshot',{token});if(!Array.isArray(rows)||rows.length!==1)throw Error('Kayıt bulunamadı veya bu kayda erişim yetkiniz yok.');return rows[0]},
  logout:token=>request('/auth/v1/logout',{method:'POST',token})
 };
})();
