# Erişilebilir onam formu

Türkçe BT/MR formunu seslendiren, cevapları geri okuyup doğrulatan ve son hasta beyanını alan web uygulaması. Arayüz GitHub Pages üzerinde çalışır. Kalıcı kayıt ve QR erişimi için ayrıca Supabase bağlantısı gerekir.

## Çalıştırma

Depo kökünde `python3 -m http.server 8000` çalıştırın. HTTPS yayını mikrofon için uygundur; desteklenmeyen veya izin verilmeyen mikrofon yerine yazılı cevap kullanılabilir.

## Hasta, sekreter ve doktor akışı

Hasta altı bölümü dinler. Ad-soyad, T.C. numarası, doğum tarihi, telefon ve tarih-saat zorunludur. Cevaplar geri okunur ve kullanıcı doğrulamadan ilerlenmez. Son adımda “Onam formunu okudum, anladım, onaylıyorum” cümlesi gerekir; “evet” veya olumsuz cevap tamamlamaz.

Bağlantı yapılandırılmışsa son beyanın ardından kayıt gönderilir. Başarılı kayıt cevabından sonra bağlantı ve QR oluşturulur. Hasta QR’ı PNG olarak telefonuna indirebilir. QR kişisel bilgileri açık metin içermez; formu açan rastgele 256 bit erişim anahtarı içerir. QR’ın veya bağlantının kopyasını alan herkes o formu okuyabilir. Anahtar URL’nin `#` bölümünde tutulur; form sunucusuna POST ile gönderilir. Bir kaydın QR’ı toplu kayıt listesini açamaz.

Sekreter özel yönetim bağlantısıyla ad-soyad ve QR listesini açar. Ekran 15 saniyede bir yenilenir ve son 100 kaydı gösterir. Her hasta için aynı QR indirilebilir veya ad-soyad ile QR etiketi yazdırılabilir. Doktor hastanın belgesine yapıştırılan QR’ı okutup doldurulan bilgileri, son beyanı ve onaylanan form metnini görür; ayrıca doktor hesabı açılması gerekmez.

Bağlantı yoksa veya kayıt başarısızsa QR gösterilmez; sonuç ekranı bunu belirtir. Aynı kayıt isteğinin aynı anahtarla yeniden gönderilmesi ikinci kayıt oluşturmaz. “Ekranı temizle” yalnızca açık ekranı temizler; sunucudaki formu silmez.

## Ücretsiz kayıt bağlantısını açma

1. Supabase üzerinde ücretsiz bir proje oluşturun. Veritabanı şifresini güvenli hesap ayarlarında saklayın; sohbete veya GitHub’a yazmayın.
2. SQL Editor’da önce [database/setup.sql](database/setup.sql), ardından [database/qr-access.sql](database/qr-access.sql) dosyasının tamamını çalıştırın. İlk dosyayı zaten çalıştırdıysanız yalnızca QR güncellemesi yeterlidir. QR güncellemesi mevcut kayıtları silmez. Önceden oluşturulmuş anahtarsız kayıtlar otomatik olarak herkese açılmaz.
3. Yönetim ekranı anahtarını oluşturmak için SQL Editor’da şu sorguyu çalıştırın:

   ```sql
   select public.rotate_onam_staff_key() as yonetim_anahtari;
   ```

   Çıkan anahtarı güvenli tutun; sohbete veya GitHub’a yazmayın. `doctor.html` ekranındaki yönetim anahtarı alanına yapıştırın. Ekran açıldıktan sonra “Yönetim bağlantısını kopyala” düğmesiyle yalnızca yetkili personelin kullanacağı bağlantıyı saklayın. Bu anahtar hasta QR’ından farklıdır. Sorguyu yeniden çalıştırmak eski yönetim bağlantısını geçersiz kılar; hasta QR’larını değiştirmez.
4. `config.js` dosyasındaki `supabaseUrl` ve `supabaseKey` alanlarını projenin Project URL ve **publishable / anon public** anahtarıyla doldurun. Bunlar tarayıcıya açık bağlantı bilgileridir. **Service-role / secret anahtarı veya veritabanı şifresi kesinlikle kullanılmaz.**
5. `config.js` değişikliğini GitHub’a gönderin. Hasta formunu tamamlayın; QR’ı indirin, başka cihazda açın ve sekreter listesinde aynı ad-soyad ile aynı QR’ın göründüğünü kontrol edin.

Form erişimini kapatmak gerekirse yönetici Supabase Table Editor’da ilgili `consent_records` satırındaki `access_revoked_at` alanına tarih-saat girer. Bu QR artık açılmaz. Ham QR anahtarları, sekreterin etiketi yeniden üretebilmesi için yalnızca erişimi kapalı `onam_receipts` tablosunda tutulur. Form araması SHA-256 özetinden yapılır; hasta veya personel tabloları doğrudan listeleyemez. Personel de yalnızca özel yönetim anahtarıyla kayıt kutusuna erişir.

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
npm install --prefix /tmp/onam-db-test --cache /tmp/onam-npm-cache @electric-sql/pglite jsqr
NODE_PATH="/tmp/onam-db-test/node_modules${NODE_PATH:+:$NODE_PATH}" node tests/database.cjs
NODE_PATH="/tmp/onam-db-test/node_modules${NODE_PATH:+:$NODE_PATH}" node tests/records-browser.cjs
NODE_PATH="/tmp/onam-db-test/node_modules${NODE_PATH:+:$NODE_PATH}" node tests/qr-access.cjs
```

Veritabanı testi gerçek PostgreSQL motorunda SQL ve satır erişim kurallarını sınar; Supabase `auth.uid()` bağlamını yerelde sağlar. Tarayıcı kayıt testi, bulut HTTP yanıtlarını taklit ederek hata/yeniden deneme, gerçek QR çözümleme, QR ile tek form erişimi, özel sekreter listesi, PNG indirme, etiket yazdırma ve görünür verilerin temizlenmesini kontrol eder. Bunlar henüz kurulmamış gerçek Supabase projesini doğrulamaz. Ses/mikrofon taklitleri de gerçek cihazdaki ses kalitesinin ve konuşma tanıma bağlantısının yerine geçmez.

QR üreticisi MIT lisanslı `qrcode-generator` paketinden `vendor/` altında saklanmıştır. QR üretiminde dış bir resim veya QR servisi kullanılmaz.
