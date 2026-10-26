# Erişilebilir onam formu

Türkçe BT/MR formunu seslendiren, cevapları geri okuyup doğrulatan ve son hasta beyanını alan web uygulaması. Arayüz GitHub Pages üzerinde çalışır. Kalıcı kayıt ve QR erişimi için ayrıca Supabase bağlantısı gerekir.

## Çalıştırma

Depo kökünde `python3 -m http.server 8000` çalıştırın. HTTPS yayını mikrofon için uygundur; desteklenmeyen veya izin verilmeyen mikrofon yerine yazılı cevap kullanılabilir.

## Hasta, sekreter ve doktor akışı

Hasta altı bölümü dinler. Ad-soyad, T.C. numarası, doğum tarihi, telefon ve tarih-saat zorunludur. Cevaplar geri okunur ve kullanıcı doğrulamadan ilerlenmez. Son adımda “Onam formunu okudum, anladım, onaylıyorum” cümlesi gerekir; “evet” veya olumsuz cevap tamamlamaz.

Bağlantı yapılandırılmışsa son beyanın ardından kayıt gönderilir. Başarılı kayıt cevabından sonra bağlantı ve QR oluşturulur. Hasta QR’ı PNG olarak telefonuna indirebilir. QR kişisel bilgileri açık metin içermez; formu açan rastgele 256 bit erişim anahtarı içerir. QR’ın veya bağlantının kopyasını alan herkes o formu okuyabilir. Anahtar URL’nin `#` bölümünde tutulur; form sunucusuna POST ile gönderilir. Bir kaydın QR’ı toplu kayıt listesini açamaz.

Sekreter `/yonetim/` adresinden e-posta ve şifreyle ad-soyad ve QR listesini açar. Hasta sayfasında yönetim bağlantısı yoktur. Yönetim aynı yayın altında ayrı bir adrestir; farklı bir alan adı kurulmuş değildir. Erişim adresin gizlenmesiyle değil, sunucuda hesap yetkisiyle korunur. Ekran 15 saniyede bir yenilenir ve son 100 kaydı gösterir. Her hasta için aynı QR indirilebilir veya ad-soyad ile QR etiketi yazdırılabilir. Doktor hastanın belgesine yapıştırılan QR’ı okutup doldurulan bilgileri, son beyanı ve onaylanan form metnini görür; ayrıca doktor hesabı açılması gerekmez.

Bağlantı yoksa veya kayıt başarısızsa QR gösterilmez; sonuç ekranı bunu belirtir. Aynı kayıt isteğinin aynı anahtarla yeniden gönderilmesi ikinci kayıt oluşturmaz. “Ekranı temizle” yalnızca açık ekranı temizler; sunucudaki formu silmez.

## Ücretsiz kayıt bağlantısını açma

1. Supabase üzerinde ücretsiz bir proje oluşturun. Veritabanı şifresini güvenli hesap ayarlarında saklayın; sohbete veya GitHub’a yazmayın.
2. SQL Editor’da önce [database/setup.sql](database/setup.sql), ardından [database/qr-access.sql](database/qr-access.sql) dosyasının tamamını çalıştırın. İlk dosyayı zaten çalıştırdıysanız yalnızca QR güncellemesi yeterlidir. QR güncellemesi mevcut kayıtları silmez. Önceden oluşturulmuş anahtarsız kayıtlar otomatik olarak herkese açılmaz.
3. SQL Editor’da [database/password-admin.sql](database/password-admin.sql) dosyasını çalıştırın. Bu güncelleme eski yönetim anahtarlarının liste erişimini kapatır; mevcut formlar ve hasta QR’ları korunur.
4. Authentication → Users → Add user → Create new user bölümünde personel hesabını oluşturun. Auto Confirm User açık olsun. Şifreyi sohbete veya kaynak dosyasına yazmayın. Hesaba kayıt yetkisi vermek için SQL Editor’da şu sorguyu, hesabın e-postasıyla çalıştırın:

   ```sql
   insert into public.onam_doctors(user_id)
   select id from auth.users where email = 'PERSONEL_HESABININ_EPOSTASI'
   on conflict do nothing returning user_id;
   ```

   Hesap oluşturmak tek başına yetki vermez. Sorgu `user_id` döndürdüğünde personel `/yonetim/` adresinden giriş yapabilir. Hasta QR’ı belirli bir formu şifresiz açmaya devam eder. Eski `doctor.html` adresi yeni giriş sayfasına yönlendirir; eski anahtarlar giriş yerine geçmez.
5. `config.js` dosyasındaki `supabaseUrl` ve `supabaseKey` alanlarını projenin Project URL ve **publishable / anon public** anahtarıyla doldurun. Bunlar tarayıcıya açık bağlantı bilgileridir. **Service-role / secret anahtarı veya veritabanı şifresi kesinlikle kullanılmaz.**
6. `config.js` değişikliğini GitHub’a gönderin. Hasta formunu tamamlayın; QR’ı indirin, başka cihazda açın ve sekreter listesinde aynı ad-soyad ile aynı QR’ın göründüğünü kontrol edin.

Form erişimini kapatmak gerekirse yönetici Supabase Table Editor’da ilgili `consent_records` satırındaki `access_revoked_at` alanına tarih-saat girer. Bu QR artık açılmaz. Ham QR anahtarları, sekreterin etiketi yeniden üretebilmesi için yalnızca erişimi kapalı `onam_receipts` tablosunda tutulur. Form araması SHA-256 özetinden yapılır; hasta veya personel tabloları doğrudan listeleyemez. Personel kayıt kutusuna Supabase Auth oturumu ve `onam_doctors` yetkisiyle erişir. Oturum bilgileri tarayıcı belleğindedir; çıkışta görünür kayıtlar temizlenir. Süresi yaklaşan erişim belirteci oturum açıkken yenilenir.

Bu depo proje hesabı oluşturmaz veya bulut veritabanına kendiliğinden SQL uygulamaz. Bağlantı ve canlı sunucu kontrolleri tamamlanmadan kalıcı kayıt hazır sayılmaz. Bir hasta beyanı saklamak, resmi kimlik doğrulaması, elektronik imza veya hastane bilgi sistemi entegrasyonu değildir.

## Ses

Sabit metinler ücretsiz `edge-tts==7.3.1` ile `tr-TR-EmelNeural` sesi kullanılarak önceden kaydedilir. API anahtarı gerekmez. Araç Microsoft’un çevrimiçi servisine bağlıdır; `speech.platform.bing.com` erişimi gerekir. Kullanıcı cevapları ses servisine gönderilmez. T.C. rakam rakam, telefon gruplarla, tarih gün–ay–yıl olarak aynı sesin kayıtlarından tarayıcıda birleştirilir. Ad-soyad geri okuması cihazın sesine bağlıdır.

Birleşimde yalnızca kayıtların baş ve sonundaki fazla sessizlik kısaltılır. Sözcükler arasında 40 ms; giriş ve son doğrulama cümlesi sınırında 140 ms ara vardır. “İki bin beş” tek kayıttır. Hız ayrıca ayarlanabilir.

Kayıtları yenilemek için:

```sh
python3 -m venv /tmp/onam-voice-venv
/tmp/onam-voice-venv/bin/pip install edge-tts==7.3.1
ONAM_VOICE_PYTHON=/tmp/onam-voice-venv/bin/python node tools/generate-audio.mjs
```

Dosyaları dinleyip telaffuzu kontrol edin. `audio/` ve manifestini birlikte yayımlayın. Değişmeyen sesler yeniden üretilmez; başarısız üretimde eski manifest korunur. Ücretli OpenAI yolu yalnızca açıkça `--provider=openai` seçilirse kullanılır; varsayılan komut bu servisi çağırmaz.

## Kontroller

Playwright ve Chromium bulunan ortamda:

```sh
node tests/browser.cjs
node tests/numbers.cjs
node tests/audio-join.cjs
node tests/natural-audio.cjs
```

Kayıt ve veritabanı kontrollerinin ek bağımlılıkları checkout dışında kurulabilir:

```sh
npm install --prefix /tmp/onam-db-test --cache /tmp/onam-npm-cache @electric-sql/pglite jsqr @axe-core/playwright
NODE_PATH="/tmp/onam-db-test/node_modules${NODE_PATH:+:$NODE_PATH}" node tests/database.cjs
NODE_PATH="/tmp/onam-db-test/node_modules${NODE_PATH:+:$NODE_PATH}" node tests/records-browser.cjs
NODE_PATH="/tmp/onam-db-test/node_modules${NODE_PATH:+:$NODE_PATH}" node tests/qr-access.cjs
NODE_PATH="/tmp/onam-db-test/node_modules${NODE_PATH:+:$NODE_PATH}" node tests/password-admin.cjs
NODE_PATH="/tmp/onam-db-test/node_modules${NODE_PATH:+:$NODE_PATH}" node tests/accessibility.cjs
```

Veritabanı testi gerçek PostgreSQL motorunda SQL ve satır erişim kurallarını sınar; Supabase `auth.uid()` bağlamını yerelde sağlar. Tarayıcı kayıt testi, bulut HTTP yanıtlarını taklit ederek hata/yeniden deneme, gerçek QR çözümleme, QR ile tek form erişimi, özel sekreter listesi, PNG indirme, etiket yazdırma ve görünür verilerin temizlenmesini kontrol eder. Bunlar henüz kurulmamış gerçek Supabase projesini doğrulamaz. Ses/mikrofon taklitleri de gerçek cihazdaki ses kalitesinin ve konuşma tanıma bağlantısının yerine geçmez.

QR üreticisi MIT lisanslı `qrcode-generator` paketinden `vendor/` altında saklanmıştır. QR üretiminde dış bir resim veya QR servisi kullanılmaz.

## Görünüm ve erişilebilirlik

Hasta ve belge ekranında büyük yazı ve yüksek kontrast seçenekleri bulunur. Yalnızca bu görünüm tercihleri yerel olarak saklanır; hasta cevapları bu amaçla depolanmaz. Klavyeyle “İçeriğe geç” ve “Okunan bölüme dön” bağlantıları kullanılabilir. Belge yazdırılırken ekran kontrast ayarından bağımsız beyaz kâğıt / siyah yazı uygulanır. Yönetim panelinde ad-soyada göre arama ve QR etiket yazdırma vardır.

Axe taramaları WCAG 2 A/AA, 2.1 AA ve 2.2 AA etiketleriyle otomatik denetim yapar. Bunlar tam erişilebilirlik belgesi değildir; TalkBack ve VoiceOver ile gerçek kullanıcı denemeleri ayrıca yapılmalıdır. Klinik form metnine ek soru eklenmez.

## Otomatik dinleme ve yeni veritabanı

Soru–cevabı başlatmak ve tarayıcının ilk mikrofon iznini vermek gerekir. Varsayılan açık otomatik dinleme, soru ve doğrulama seslendirmesi tamamlandıktan sonra başlar. Hasta cevabı söyler, geri okumayı dinler ve “bilgilerim doğru” ya da “düzelteceğim” der. Tarih-saat sorusunda “evet” önerilen zamanı seçer. Son beyan tam cümleyle alınır; geri okumadan sonra “beyanımı tamamla” veya “onaylıyorum” ile tamamlanır. Yazmaya başlamak, Durdur, sıfırlama, sekmeyi gizleme veya otomatik dinlemeyi kapatma mikrofonu durdurur. Sessizlik veya hizmet hatasında düğmeyle tekrar denenebilir. Gerçek cihaz ve mikrofonla deneme gerekir.

Erişimi kaybedilen eski Supabase bağlantısı kaldırıldı; config.js yeni Supabase projesine bağlandı. Kayıt ve QR için yeni projede SQL kurulumu ve personel yetkisi tamamlanmalıdır. Yeni ücretsiz Supabase projesinde yukarıdaki üç SQL dosyasını sırayla çalıştırın, personel hesabını yetkilendirin ve config.js alanlarını doldurun. Yeni proje eski kayıtları içermez; eski QR bağlantıları yeni veritabanına taşınmış olmaz.

## Duraksayarak sesli cevap verme

Ad-soyad ve doğum tarihi cevabını bitirince “tamam” veya “bitti” deyin. Örneğin “beş … ekim … iki bin … beş … tamam”, 05.10.2005 olarak doğrulamaya gönderilir. “İki bin” tek başına 2000 yılı da olabileceği için tarih sessizlikle tamamlanmış sayılmaz. Türkçe aylar, sözcüklerle söylenen sayılar ve ikibin gibi birleşik sayı yazımları desteklenir; eksik üç basamaklı yıllar tamamlanmaz. T.C. ve telefon gerekli rakam sayısına kadar biriktirilir; rakamları tek tek söyleyin. “Baştan” diyerek mevcut cevabı temizleyebilirsiniz. Son beyanın tamamı ve ardından ayrı doğrulaması gerekir. Önerilen tarih-saat için “evet” denebilir; değiştirmek için örneğin “yirmi dört ekim iki bin yirmi altı saat on dört dakika otuz tamam” deyin.

Her cevap için ayrı konuşma oturumu kullanılır. Oturum tarayıcı tarafından sonlandırılırsa eldeki metin korunur; mikrofon düğmesiyle devam edilir. Tarayıcı hizmeti/ağ hataları ve mobilde otomatik başlatma davranışı gerçek cihaz testini gerektirir. Hata sonrası geç gelen sonuçlar işlenmez. Bu akışın testleri: `node tests/spoken-dates.cjs`, `node tests/auto-listen.cjs`, `node tests/browser.cjs`. Tarayıcı testleri gerçek mikrofon yerine taklit sonuç kullanır.

## Otomatik tarih ve saat onayı

Tarih-saat adımına girildiği anda cihazın yerel tarih ve saati alınır, gösterilir ve seslendirilir. Hasta yalnızca “tamam” veya “evet” diyerek bu değeri bir kez onaylayıp sonraki soruya geçebilir; tekrar tarih-saat söylemesi veya ikinci onay vermesi gerekmez. Değeri değiştirirse yeni tarih-saat geri okunarak ayrıca doğrulatılır. Cihazın tarih-saat ayarları esas alınır.

## Son beyanı sesle tamamlama

Hasta altıncı soruda tam beyan cümlesini söyler. Beyanı geri okunduktan sonra “beyanımı tamamla” veya “onaylıyorum” diyerek işlemi bitirir. Düğmeyle tamamlama ve tam cümleyi tekrar söyleme de desteklenir. “Evet”, “tamam” veya “onaylamıyorum” son beyanı tamamlamaz. Kayıtta hastanın tam beyan cümlesi korunur.

## Sesli başlangıç rehberi

Hasta sayfası açıldığında erişilebilir bir başlangıç penceresi görünür. “Sesli onam formunu başlat” düğmesi kullanıcı dokunuşuyla altı bölümün sırayla okunmasını başlatır; ekran ve klavye odağı okunan bölümün başlığına ilerler. Son bölüm tamamlandığında bilgiler ve son beyan için soru-cevap alanı otomatik açılır. Okuma boyunca sabit kontrollerle duraklatılabilir, devam edilebilir veya durdurulabilir. Durdurma ve tek bölüm okumaya geçme otomatik geçişi iptal eder. “Kendim okuyacağım” veya Escape pencereyi kapatır; o anda kendiliğinden ses çalınmaz. Hareketi azaltma tercihi izlenir.

## Sesli veya sessiz açılış

Başlangıç penceresinde yalnızca “Sesli başlat” ve “Sessiz, kendim okuyacağım” seçenekleri bulunur. Pencere açılırken kısa seçim yönlendirmesini seslendirmek denenir; tarayıcı kullanıcı dokunuşu olmadan sesi engelleyebilir. İki seçenek bu durumda da kullanılabilir. Sesli başlat kullanıcı dokunuşuyla kullanım açıklamasını, sonra altı form bölümünü okuyup bilgiler akışına geçer. Sessiz seçeneği uygulama seslerini ve otomatik mikrofonu kapatır; sorular ve cevap doğrulamaları yazılı kullanılabilir. Escape de sessiz seçime geçer. Tümünü Oku veya bölüm okuma düğmesi açıkça seçilirse sesli okuma yeniden açılır.

Ek odak anlatımı ve ayrı kullanım anlatımı düğmeleri kaldırılmıştır. Yerleşik ekran okuyucu desteği, düğme açıklamaları ve soruya göre değişen cevap etiketi korunur. Mobil görünümde seçim düğmeleri en az 72 piksel yüksekliğindedir. Chrome testleri dar ekranları, engellenen ilk ses denemesinden sonra dokunarak başlamayı, sessiz modda ses/mikrofon açılmamasını ve altı bölümden soru-cevaba geçişi kapsar. Ses ve mikrofon testlerde taklit edilir; gerçek Android/iPhone ve ekran okuyucu kullanıcı testleri ayrıca gerekir.

## Kısa ve farklı tanınan son beyan

İlk beyan cevabında “Okudum, anladım, onaylıyorum” da kabul edilir. “Onan formunu okudum, anladım, onaylıyorum” ifadesi konuşma tanımanın onam/onan farklılığı olarak eşleştirilir. Eşleştirme yalnızca bu tam olumlu cümleler için yapılır; eksik ifadeler, anlamadım ve onaylamıyorum kabul edilmez. Sistem standart tam beyanı geri okur ve son onayı ayrıca alır. Standart beyanla birlikte ilk söylenen ifade answers.declaration.spokenDeclaration içinde korunur. Sunucu şeması değişmez.

## Kent yönetim ekranı, arşiv ve Windows uygulaması

Yönetim ekranı İstanbul Kent Üniversitesi öğrenci projesi temasıyla yenilendi. Resmî görsel kaynakları assets/README.md içinde belirtilir. e-Nabız veya üniversitenin resmî sistemi değildir.

Mevcut kurulumun üzerine database/archive-admin.sql dosyasını Supabase SQL Editor'da çalıştırın. Kayıt seçimi, arşive alma ve arşivden geri alma açılır. Arşivleme consent_records veya onam_receipts satırlarını silmez/değiştirmez; aynı hasta QR kodu aynı formu açmaya devam eder. Personel kimliği ve zamanıyla arşiv/geri alma olayları ayrı, doğrudan erişime kapalı tablolarda tutulur. İşlem yalnızca onam_doctors yetkili hesaplarına açıktır. Eski kurulumda listeler çalışır; arşiv işlevi kurulum mesajıyla pasif kalır. Her görünüm son 100 kaydı getirir.

Windows uygulamasının C# kaynakları ve derleme komutu desktop/ altında bulunur. WebView2 tabanlı uygulama aynı Supabase'e bağlanır; açık oturumda liste 15 saniyede bir yenilenir. Internet ve Windows x64/WebView2 gerekir. Uygulama dosyaları birlikte dağıtılır; test paketi kod imzalı değildir. config.js içindeki publicSiteUrl, masaüstünde QR adresinin yerel bilgisayar alan adına dönüşmesini önler. Web kullanıcıları aynı genel belge adresini kullanır.

Kontroller: tests/archive-admin.cjs gerçek PostgreSQL motoruyla arşivleme/geri alma, kimlik/yetki, değişmeyen hasta QR/form içeriği, audit olayları ve atomik hataları sınar. tests/admin-archive-browser.cjs seçim/onay/iptal, aynı QR, geri alma, eski SQL'ye geçiş ve responsive düzeni taklit HTTP ile sınar. Windows EXE yerel açılış testinde giriş ekranı ve Windows uygulaması etiketi doğrulanır; gerçek kullanıcı şifresiyle giriş veya canlı hasta verisi değişikliği yapılmaz.

## Sağlık öyküsü soru akışı

Kimlik ve iletişim bilgilerinden sonra, son beyandan önce 10 ortak MR/BT sağlık öyküsü sorusu sorulur. Ana düğmeler Evet/Hayır; sesli “bilmiyorum” yanıtı ayrı Bilmiyorum değeri olarak geri okunup doğrulanır. Evet yanıtlarında gereken kısa açıklama alınır; Hayır ve Bilmiyorum ek açıklamayı atlar. Klinik uygunluk kararı verilmez.

Sürüm: health-history-v1. Yanıtlar mevcut altı alanlı answers nesnesinin declaration.healthHistory alanında sürümlü metadata olarak saklanır; sunucunun var olan JSONB ve QR uçlarıyla uyumludur. Yeni SQL kurulumu gerekmez. Açıklamalar 120 karakter ve 180 UTF-8 bayt ile sınırlıdır; altı temel alan ve toplam 6000 bayt sunucu sınırı korunur. Eski kayıtlar açılır; sağlık öyküsü bulunmadığı belirtilir. Form ayrıntısında ve PDF’de sağlık soruları gösterilir. Yeni sürümde soru metni değiştirilecekse eski sürümün anlamını korumak için yeni sağlık öyküsü sürümü tanımlanmalıdır.

Kontroller: node tests/health-history.cjs; node tests/health-history-database.cjs. Veritabanı testi @electric-sql/pglite kullanır ve üretim Supabase projesine yazmaz. Yeni sorular klinik kullanım öncesi radyoloji ekibi tarafından gözden geçirilmelidir.

## Kısa sesli yönlendirme ve düzeltme aralığı

Ortak Evet/Hayır/Bilmiyorum yönlendirmesi sağlık bölümünün başında bir kez okunur. Açıklama sonundaki tamam komutu da bu yönergede anlatılır. Toplam cevap dinleme sınırı 240 saniye, normal doğrulama sınırı 45 saniyedir; tarayıcı oturum sonlandırmalarında en çok altı devam denemesi yapılır. Ağ hatasında tek yeniden deneme sınırı korunur.

Otomatik dinleme açıkken sağlık ana yanıtı geri okunduktan ve mikrofon başladıktan sonra 6 saniye düzeltme için dinlenir. Konuşma başlaması, geçici bir sonuç, hata veya kullanıcı durdurması otomatik geçişi iptal eder. Hayır/Yanlış soruyu yeniden açar. Kimlik bilgileri, açıklamalar ve son beyan kendiliğinden onaylanmaz.

QR oluşturuldu duyurusu ancak kayıt ve QR çizimi başarılı olunca yapılır. Sağlık yanıtları açılan formda ve PDF’de salt okunur Evet/Hayır/Bilmiyorum kutuları ile gösterilir. Testler: node tests/speech-recovery.cjs; node tests/receipt-feedback.cjs. Tarayıcı düzeltme aralığı denemesi için tests/health-history-browser.html?grace=auto, ?grace=correction ve ?grace=network kullanılabilir; bunlar yalnızca test verisi kullanır.
