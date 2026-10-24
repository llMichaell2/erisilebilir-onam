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

- Konuşma tanıma, Chrome sağlayıcısının çevrimiçi hizmetini kullanabilir. Ses dosyaları üretilmemişse cihazın Türkçe sesi kullanılır. Doğal ses durum bilgisi sayfada gösterilir. T.C., telefon ve tarih cevapları aynı kadın sesinin rakam kayıtlarıyla geri okunur; ad-soyad için cihaz sesi kullanılır.
- Cevaplar yalnızca sayfa belleğinde tutulur; localStorage, veritabanı veya hastane sistemine yazılmaz. Sayfayı yenilemek cevapları siler. İndirme kullanıcı tarafından başlatılır.
- Geri okuyup onaylatma kimlik doğrulaması değildir. Dinleme/anlama beyanı işlem veya kontrast madde onamı ve imza yerine geçmez. Gerçek hastane kaydı için ayrıca yetkilendirilmiş sunucu ve kurum entegrasyonu gerekir.
- Kaynak fotoğraflardaki klinik metinler aktarılmıştır; tıbbi geçerlilik değerlendirmesi yapılmamıştır.

## Otomatik kontroller

Playwright ve Chromium bulunan geliştirme ortamında `node tests/browser.cjs` çalıştırın. Gerekirse Chromium konumunu `CHROMIUM_PATH` ile belirtin. Kontroller sayfayı yerel dosyalardan HTTP yanıtı gibi sunar; ses ve konuşma tanıma API’leri taklit edilir. Bunlar gerçek ses kalitesini, mikrofonu, Chrome’un çevrimiçi tanıma hizmetini veya GitHub Pages dağıtımını doğrulamaz.

## Ücretsiz doğal ses dosyalarının hazırlanması

Varsayılan üretim yolu `edge-tts` ve Türkçe `tr-TR-EmelNeural` sesidir. API anahtarı gerekmez. Bu üçüncü taraf araç Microsoft’un çevrimiçi Edge ses servisine bağlıdır; hizmetin kullanılabilirliği garanti edilemez. `speech.platform.bing.com` erişimi gerekir. Kullanıcı cevapları bu servise gönderilmez; yalnızca formun altı bölümü, sabit sorular ve ortak doğrulama/rakam ifadeleri seslendirilir.

Depo dışında bir sanal ortam hazırlayın:

```sh
python3 -m venv /tmp/onam-voice-venv
/tmp/onam-voice-venv/bin/pip install edge-tts==7.3.1
ONAM_VOICE_PYTHON=/tmp/onam-voice-venv/bin/python node tools/generate-audio.mjs
```

Oluşan kayıtları dinleyip telaffuzu kontrol edin. `audio/` MP3 dosyaları ve manifestini birlikte yayımlayın. GitHub Pages dosyaları çalar; sürekli sunucu gerekmez. Metin değişirse komutu tekrar çalıştırın. Değişmeyen kayıtlar yeniden üretilmez, başarısız üretimde eski manifest korunur. Boş manifest, doğal sesin henüz etkin olmadığı anlamına gelir. Servis bağlantısı ve gerçek ses kalitesi başarılı olmadan doğal ses hazır sayılmaz.

Ücretli OpenAI üretimi ayrı ve açıkça seçilen bir seçenektir: `NODE_USE_ENV_PROXY=1 node tools/generate-audio.mjs --provider=openai`. Bu yol `TTS_API_KEY` gerektirir; varsayılan komut bu hizmeti kullanmaz. Anahtarı asla kaynak dosyasına veya GitHub’a yazmayın.

`node tests/natural-audio.cjs` ücretli üreticinin istek biçimini, önbelleğini, başarısızlık davranışını ve oynatmayı taklitlerle sınar. Gerçek sağlayıcı bağlantısını veya ses kalitesini doğrulamaz.
