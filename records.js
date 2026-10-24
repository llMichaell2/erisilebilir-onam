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
 const isKey=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
 window.OnamRecords={configured,isId:value=>uuid.test(value),isKey,
  createKey(){const bytes=crypto.getRandomValues(new Uint8Array(32));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')},
  async submit(report,accessToken){if(!isKey(accessToken))throw Error('QR erişim anahtarı oluşturulamadı.');const id=await request('/rest/v1/rpc/submit_consent',{method:'POST',body:{p_submission_id:report.submissionId,p_form_version:report.formVersion,p_answers:report.answers,p_access_token:accessToken}});if(typeof id!=='string'||!uuid.test(id))throw Error('Kayıt servisi geçerli bir kayıt numarası döndürmedi.');return id},
  recordUrl(key){if(!isKey(key))throw Error('QR anahtarı geçersiz');const url=new URL('record.html',location.href);url.hash='key='+key;return url.href},
  staffUrl(key){if(!isKey(key))throw Error('Yönetim anahtarı geçersiz');const url=new URL('doctor.html',location.href);url.hash='key='+key;return url.href},
  async getByKey(key){if(!isKey(key))throw Error('QR bağlantısı geçersiz.');const record=await request('/rest/v1/rpc/get_consent_by_token',{method:'POST',body:{p_access_token:key}});if(!record)throw Error('Form bulunamadı veya bu QR bağlantısının erişimi kapatılmış.');return record},
  async listByStaffKey(key){if(!isKey(key))throw Error('Yönetim anahtarı geçersiz.');const result=await request('/rest/v1/rpc/list_onam_receipts',{method:'POST',body:{p_staff_key:key}});if(!result||!Array.isArray(result.records))throw Error('Yönetim bağlantısı doğrulanamadı.');return result.records}
 };
})();
