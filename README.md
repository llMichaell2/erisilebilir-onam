# Erişilebilir onam formu — deneme

GitHub Pages üzerinde çalışan, sunucusuz Türkçe BT/MR form okuyucusu ve sesli soru–cevap prototipi.

## Çalıştırma

Depo kökünde `python3 -m http.server 8000` çalıştırın. Yayındaki GitHub Pages sayfası HTTPS kullanır. Mikrofon desteği tarayıcı, işletim sistemi, izin ve bağlantıya bağlıdır; desteklenmezse yazıyla devam edilebilir.

## Telefon ve bilgisayarda deneme

1. Sayfayı yenileyin. “Türkçe ses” listesinden cihazınızdaki sesleri deneyin. Liste boşsa cihazın metin okuma ayarlarından Türkçe ses yükleyin. Ses ve hız değişikliği sonraki cümlede uygulanır.
2. Riskler bölümünü dinleyin: MR “emar”, BT “bilgisayarlı tomografi”, yüzde ve aralık ifadeleri kelimelerle okunmalıdır. Duraklatma, devam ve durdurmayı deneyin.
3. “Soru–cevabı başlat” düğmesine basın. Hayali bilgiler kullanın. Soruyu dinleyin, sonra “Mikrofonla cevap ver” düğmesine basıp Chrome’un izin istemini yanıtlayın. “Dinliyorum” yazınca konuşun.
4. Geri okunan cevabı kontrol edin. “Bilgilerim doğru” ile ilerleyin veya “Düzelteceğim” ile yeniden cevap verin. Mikrofon düğmesiyle de aynı ifadeler söylenebilir. Her konuşma için mikrofon düğmesine yeniden basılır; sürekli dinleme yapılmaz.
5. Mikrofon çalışmazsa cevabı yazın ve “Cevabımı kontrol et” düğmesini kullanın. Ad-soyad, T.C. kimlik numarası, doğum tarihi, telefon ve tarih-saat zorunludur; atlama yoktur. T.C. kontrol basamakları biçim kontrolüdür, resmi kimlik doğrulaması değildir. Tarih-saat cihazın yerel saatinden önerilir, kullanıcı doğrular. Son adımda “Onam formunu okudum, anladım, onaylıyorum” cümlesi gerekir; “evet” tamamlamaz, olumsuz beyan onay sayılmaz. Beyan geri okunduktan sonra “Beyanımı tamamla” düğmesi veya aynı tam cümleyle bitirilir.
6. Deneme özetini isteğe bağlı JSON olarak indirin. “Bilgileri sil” düğmesi açık sayfadaki cevapları temizler; daha önce indirilen dosyayı silmez.

## Sınırlar

- Konuşma tanıma, Chrome sağlayıcısının çevrimiçi hizmetini kullanabilir. Ses dosyaları üretilmemişse cihazın Türkçe sesi kullanılır. Doğal ses durum bilgisi sayfada gösterilir. Cevaplar cihaz sesiyle geri okunur; T.C. ve telefon rakam rakam okunur.
- Cevaplar yalnızca sayfa belleğinde tutulur; localStorage, veritabanı veya hastane sistemine yazılmaz. Sayfayı yenilemek cevapları siler. İndirme kullanıcı tarafından başlatılır.
- Geri okuyup onaylatma kimlik doğrulaması değildir. Dinleme/anlama beyanı işlem veya kontrast madde onamı ve imza yerine geçmez. Gerçek hastane kaydı için ayrıca yetkilendirilmiş sunucu ve kurum entegrasyonu gerekir.
- Kaynak fotoğraflardaki klinik metinler aktarılmıştır; tıbbi geçerlilik değerlendirmesi yapılmamıştır.

## Otomatik kontroller

Playwright ve Chromium bulunan geliştirme ortamında `node tests/browser.cjs` çalıştırın. Gerekirse Chromium konumunu `CHROMIUM_PATH` ile belirtin. Kontroller sayfayı yerel dosyalardan HTTP yanıtı gibi sunar; ses ve konuşma tanıma API’leri taklit edilir. Bunlar gerçek ses kalitesini, mikrofonu, Chrome’un çevrimiçi tanıma hizmetini veya GitHub Pages dağıtımını doğrulamaz.

## Doğal ses dosyalarının hazırlanması

Formun altı bölümü ve altı sabit soru için OpenAI ses hizmetiyle bir kez MP3 üretilir. GitHub Pages bu dosyaları sunar; sürekli çalışan sunucu ve tarayıcıda API anahtarı gerekmez. Kullanıcı cevapları bu hizmete gönderilmez. Sesler yapay zekâ ile üretilir ve bu bilgi arayüzde gösterilir.

1. Ortamın güvenli ayarlarında `TTS_API_KEY` tanımlayın; anahtarı sohbete, kaynak dosyasına veya GitHub’a yazmayın. `api.openai.com` erişimi gerekir. Üretim sağlayıcının kullanım ücretine tabidir.
2. Depo kökünde `NODE_USE_ENV_PROXY=1 node tools/generate-audio.mjs` çalıştırın. Model `gpt-4o-mini-tts`, ses `coral`. Script yalnızca kaynak koddaki sabit bölüm ve soruları okur. Eksik anahtarda işlem yapmadan hata verir.
3. Oluşan 12 ses kaydını dinleyip telaffuzu kontrol edin. `audio/` MP3 dosyaları ve manifestini birlikte yayımlayın. Metin/soru değişince komutu tekrar çalıştırın; değişmeyen kayıtlar yeniden üretilmez. Başarısız üretimde eski manifest korunur.
4. Boş `audio/manifest.json` doğal sesin henüz etkin olmadığı anlamına gelir. MP3 üretimi sağlayıcıya gerçek bir istek başarılı olmadan tamamlanmış sayılmaz.

`node tests/natural-audio.cjs` ses üretiminin istek biçimini, önbelleğini, başarısızlık davranışını ve oynatmayı taklitlerle sınar. Gerçek sağlayıcı bağlantısını veya ses kalitesini doğrulamaz.
