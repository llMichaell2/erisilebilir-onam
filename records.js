(() => {
 const config=window.ONAM_CONFIG||{};
 const configured=!!config.supabaseUrl&&!!config.supabaseKey;
 const base=(config.supabaseUrl||'').replace(/\/$/,'');
 const siteBase=new URL(config.publicSiteUrl||'.',document.currentScript.src);
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 async function request(path,{token,body,method='GET'}={}){
  if(!configured)throw Error('Kayıt bağlantısı henüz ayarlanmadı. Form bu açık sayfada duruyor; özeti indirebilirsiniz.');
  if(!base.startsWith('https://'))throw Error('Kayıt bağlantısı HTTPS kullanmalıdır.');
  const headers={apikey:config.supabaseKey};if(token)headers.Authorization='Bearer '+token;
  if(body)headers['Content-Type']='application/json';
  let response;try{response=await fetch(base+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)})}catch{throw Error('Kayıt servisine ulaşılamadı. İnternet bağlantısını kontrol edip tekrar deneyin.')}
  if(!response.ok){let details={};try{details=await response.json()}catch{};const error=Error(response.status===401||response.status===403?'Giriş veya erişim yetkisi doğrulanamadı.':'İşlem tamamlanamadı. Bilgileri ve kayıt bağlantısını kontrol edin.');error.status=response.status;error.code=details.code;throw error}
  if(response.status===204)return null;return response.json();
 }
 const isKey=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
 window.OnamRecords={configured,isId:value=>uuid.test(value),isKey,
  createKey(){const bytes=crypto.getRandomValues(new Uint8Array(32));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('')},
  async submit(report,accessToken){if(!isKey(accessToken))throw Error('QR erişim anahtarı oluşturulamadı.');const id=await request('/rest/v1/rpc/submit_consent',{method:'POST',body:{p_submission_id:report.submissionId,p_form_version:report.formVersion,p_answers:report.answers,p_access_token:accessToken}});if(typeof id!=='string'||!uuid.test(id))throw Error('Kayıt servisi geçerli bir kayıt numarası döndürmedi.');return id},
  recordUrl(key){if(!isKey(key))throw Error('QR anahtarı geçersiz');const url=new URL('record.html',siteBase);url.hash='key='+key;return url.href},
  async getByKey(key){if(!isKey(key))throw Error('QR bağlantısı geçersiz.');const record=await request('/rest/v1/rpc/get_consent_by_token',{method:'POST',body:{p_access_token:key}});if(!record)throw Error('Form bulunamadı veya bu QR bağlantısının erişimi kapatılmış.');return record},
  async login(email,password){
   try{const session=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});if(!session.access_token||!session.refresh_token)throw Error();return session}catch{throw Error('Giriş yapılamadı. E-posta, şifre ve bağlantınızı kontrol edin.')}
  },
  refreshSession:refreshToken=>request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:refreshToken}}),
  logout:token=>request('/auth/v1/logout?scope=local',{method:'POST',token}),
  async listAuthenticated(token,archived=false){
   let result;
   try{result=await request('/rest/v1/rpc/list_onam_receipts_v2',{method:'POST',token,body:{p_archived:archived}})}catch(error){
    if(error.status!==404||!['PGRST202','42883'].includes(error.code))throw error;
    const legacy=await request('/rest/v1/rpc/list_onam_receipts_authenticated',{method:'POST',token,body:{}});
    if(!legacy||!Array.isArray(legacy.records))throw Error('Bu hesabın kayıtları görüntüleme yetkisi yok.');
    result={records:archived?[]:legacy.records,active_count:legacy.records.length,archived_count:0,archive_enabled:false};
   }
   if(!result||!Array.isArray(result.records))throw Error('Bu hesabın kayıtları görüntüleme yetkisi yok.');return result;
  },
  async setArchive(token,ids,archived){
   if(!Array.isArray(ids)||!ids.length||ids.length>100||ids.some(id=>!uuid.test(id))||typeof archived!=='boolean')throw Error('Geçerli kayıtları seçin.');
   const result=await request('/rest/v1/rpc/set_onam_archive',{method:'POST',token,body:{p_record_ids:ids,p_archived:archived}});
   if(!result||!Number.isInteger(result.changed))throw Error('Arşiv işlemi doğrulanamadı. Listeyi yenileyin.');return result;
  }
 };
})();
