# Erişilebilir onam formu

Türkçe BT/MR formunu seslendiren, cevapları geri okuyup doğrulatan ve son hasta beyanını alan web uygulaması. Arayüz GitHub Pages üzerinde çalışır. Kalıcı kayıt ve doktor erişimi için ayrıca Supabase bağlantısı gerekir.

## Çalıştırma

Depo kökünde `python3 -m http.server 8000` çalıştırın. HTTPS yayını mikrofon için uygundur; desteklenmeyen veya izin verilmeyen mikrofon yerine yazılı cevap kullanılabilir.

## Hasta ve doktor akışı

Hasta altı bölümü dinler. Ad-soyad, T.C. numarası, doğum tarihi, telefon ve tarih-saat zorunludur. Cevaplar geri okunur ve kullanıcı doğrulamadan ilerlenmez. Son adımda “Onam formunu okudum, anladım, onaylıyorum” cümlesi gerekir; “evet” veya olumsuz cevap tamamlamaz.

Bağlantı yapılandırılmışsa son beyanın ardından kayıt gönderilir. Başarılı kayıt cevabından sonra doktor bağlantısı ve QR oluşturulur. QR yalnızca rastgele kayıt numarası içerir. Doktor telefon kamerasıyla QR’ı açar, giriş yapar ve formu okur. Kayıtlar doktor ekranında ayrıca listelenir. Yetkisi olmayan bir kullanıcı, kayıt numarasını bilse bile verileri okuyamaz.

Bağlantı yoksa veya kayıt başarısızsa QR gösterilmez; sonuç ekranı bunu açıkça belirtir. Kullanıcı açık sayfadaki özeti indirebilir. Aynı kayıt isteğinin yeniden gönderilmesi ikinci kayıt oluşturmaz. “Ekranı temizle” yalnızca açık ekranı temizler; daha önce sunucuya kaydedilmiş formu silmez.

## Ücretsiz kayıt bağlantısını açma

Hesap sahibinin bir kez yapacağı işlemler:

1. Supabase üzerinde ücretsiz bir proje oluşturun. Veritabanı şifresini güvenli hesap ayarlarında saklayın; sohbete veya GitHub’a yazmayın.
2. Projenin SQL Editor ekranında [database/setup.sql](database/setup.sql) dosyasının tamamını çalıştırın. Bu, tabloları ve erişim kurallarını oluşturur. Scripti kaynak form değişmedikçe tekrar çalıştırmak verileri silmez. Yayımlanan bir form metnini değiştirmek için yeni form sürümü oluşturun; eski kayıtların metinlerini değiştirmeyin.
3. Authentication → Users bölümünde doktor hesabını oluşturun. Kullanıcı kendi kendine doktor olamaz. Hesabı yetkilendirmek için SQL Editor’da şu sorguyu, kendi doktor hesabınızın e-postasıyla çalıştırın:

   ```sql
   insert into public.onam_doctors(user_id)
   select id from auth.users where email = 'doktor-hesabinin-epostasi'
   on conflict do nothing;
   ```

4. `config.js` dosyasındaki `supabaseUrl` ve `supabaseKey` alanlarını projenin Project URL ve **publishable / anon public** anahtarıyla doldurun. Bunlar tarayıcıya açık bağlantı bilgileridir. **Service-role / secret anahtarı veya veritabanı şifresi kesinlikle kullanılmaz.** Erişim yetkisi anahtarın gizli tutulmasına değil SQL erişim kurallarına dayanır.
5. `config.js` değişikliğini GitHub’a gönderin. Hasta formunu bir tamamlayın; sonrasında QR’ı başka cihazda açıp doktor hesabıyla giriş yapın. Yetkisiz bir hesapla verilerin görüntülenmediğini ayrıca kontrol edin.

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
```

Veritabanı testi gerçek PostgreSQL motorunda SQL ve satır erişim kurallarını sınar; Supabase `auth.uid()` bağlamını yerelde sağlar. Tarayıcı kayıt testi, bulut HTTP yanıtlarını taklit ederek hata/yeniden deneme, gerçek QR çözümleme, doktor girişi ve görünür verilerin temizlenmesini kontrol eder. Bunlar henüz kurulmamış gerçek Supabase projesini doğrulamaz. Ses/mikrofon taklitleri de gerçek cihazdaki ses kalitesinin ve konuşma tanıma bağlantısının yerine geçmez.

QR üreticisi MIT lisanslı `qrcode-generator` paketinden `vendor/` altında saklanmıştır. QR üretiminde dış bir resim veya QR servisi kullanılmaz.
