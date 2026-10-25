// Native screen-reader descriptions. No extra focus narration.
(() => {
 const descriptions={
  'welcome-start':'Kullanım açıklamasını ve altı form bölümünü sırayla okur, ardından bilgiler kısmını açar.',
  'welcome-dismiss':'Sesleri ve otomatik mikrofonu kapatır. Formu okuyarak ve yazarak doldurabilirsiniz.',
  'text-size':'Sayfadaki metinleri büyütür veya normal boyuta döndürür.',
  'contrast':'Yüksek kontrast görünümünü açar veya kapatır.',
  'qa-open':'Doğrudan hasta bilgileri ve son beyan sorularına geçer. Form bölümlerini baştan okumaz.',
  'play':'Formun altı bölümünü baştan sona okur. Bilgiler kısmını kendiliğinden açmak için başlangıç penceresindeki sesli rehberi kullanın.',
  'previous':'Bir önceki form bölümünü okur.',
  'next':'Bir sonraki form bölümünü okur.',
  'stop':'Sesli okumayı ve mikrofonu durdurur. Otomatik ilerlemeyi iptal eder.',
  'pause':'Formun okunmasını geçici olarak duraklatır.',
  'resume':'Duraklatılmış form okumasını sürdürür.',
  'guided-stop':'Sesli rehber çubuğunda okumayı durdurur; bilgiler kısmına otomatik geçişi iptal eder.',
  'guided-pause':'Sesli rehber çubuğunda okumayı duraklatır.',
  'guided-resume':'Sesli rehber çubuğunda duraklatılmış okumayı sürdürür.',
  'go-current':'Ekranı ve klavye odağını o anda okunan form bölümünün başlığına taşır.',
  'voice-select':'Cevapların geri okunacağı cihaz sesini seçer. Seçim sonraki seslendirmede kullanılır.',
  'qa-auto':'Açıksa soru ve geri okuma bittikten sonra mikrofonun otomatik başlamasını dener. Mikrofon izni gerekir.',
  'qa-start':'Hasta bilgileri ve son beyan için altı soruluk akışı başlatır.',
  'qa-answer':'Sorulan bilginin cevap alanıdır. Konuşmak istemezseniz cevabınızı yazabilirsiniz. Buradaki kişisel bilgi sesli düğme rehberi tarafından okunmaz.',
  'qa-listen':'Mikrofonu başlatır veya yeniden başlatır. Korunan cevabınıza devam edebilirsiniz. İzin istenirse tarayıcıdan mikrofon izni verin.',
  'qa-repeat':'Şu anki soruyu veya cevap doğrulamasını yeniden okur.',
  'qa-submit':'Yazdığınız cevabı kontrol edip doğrulama için geri okur.',
  'qa-confirm':'Geri okunan cevabınızı onaylar ve bir sonraki adıma geçer. Son beyan adımında işlemi tamamlar.',
  'qa-correct':'Bu cevabı yeniden girebilmeniz için aynı soruyu baştan açar.',
  'qa-reset':'Okumayı ve mikrofonu durdurur; bu ekrandaki hasta cevaplarını temizler.',
  'qa-clear':'Bu ekrandaki form özetini ve cevapları temizler. Sunucuya kaydedilmiş formu silmez.',
  'qa-save-retry':'Kaydedilemeyen formu sunucuya göndermeyi yeniden dener.',
  'qa-qr-download':'Kaydedilen formun QR kodunu resim olarak indirir.',
  'qa-record-link':'Onaylanıp kaydedilmiş formun görüntüleneceği belgeyi açar.',
  'qa-download':'Hasta bilgilerini ve onaylanan form metnini PDF dosyası olarak indirir.'
 };
 for(const [id,description] of Object.entries(descriptions)){
  const control=document.getElementById(id);if(!control)continue;
  const hint=document.createElement('span');hint.id=id+'-help';hint.className='sr-only';hint.textContent=description;
  control.parentElement.appendChild(hint);
  const existing=control.getAttribute('aria-describedby');control.setAttribute('aria-describedby',[existing,hint.id].filter(Boolean).join(' '));
 }
 for(const button of document.querySelectorAll('[data-rate]'))button.setAttribute('aria-label',button.textContent+' okuma hızı');
})();
