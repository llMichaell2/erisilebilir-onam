# Erişilebilir onam formu — deneme

GitHub Pages üzerinde çalışan, sunucusuz Türkçe BT/MR form okuyucusu ve sesli soru–cevap prototipi.

## Çalıştırma

Depo kökünde `python3 -m http.server 8000` çalıştırın. Yayındaki GitHub Pages sayfası HTTPS kullanır. Mikrofon desteği tarayıcı, işletim sistemi, izin ve bağlantıya bağlıdır; desteklenmezse yazıyla devam edilebilir.

## Telefon ve bilgisayarda deneme

1. Sayfayı yenileyin. “Türkçe ses” listesinden cihazınızdaki sesleri deneyin. Liste boşsa cihazın metin okuma ayarlarından Türkçe ses yükleyin. Ses ve hız değişikliği sonraki cümlede uygulanır.
2. Riskler bölümünü dinleyin: MR “emar”, BT “bilgisayarlı tomografi”, yüzde ve aralık ifadeleri kelimelerle okunmalıdır. Duraklatma, devam ve durdurmayı deneyin.
3. “Soru–cevabı başlat” düğmesine basın. Hayali bilgiler kullanın. Soruyu dinleyin, sonra “Mikrofonla cevap ver” düğmesine basıp Chrome’un izin istemini yanıtlayın. “Dinliyorum” yazınca konuşun.
4. Geri okunan cevabı kontrol edin. “Evet, doğru” ile ilerleyin veya “Hayır, düzelteceğim” ile yeniden cevap verin. Onay aşamasında mikrofon düğmesiyle evet/hayır da söylenebilir. Her konuşma için mikrofon düğmesine yeniden basılır; sürekli dinleme yapılmaz.
5. Mikrofon çalışmazsa cevabı yazın ve “Cevabımı kontrol et” düğmesini kullanın. İsteğe bağlı sorular atlanabilir. “Hayır” ve “anlamadım” cevaplarının özette olumsuz gösterildiğini kontrol edin.
6. Deneme özetini isteğe bağlı JSON olarak indirin. “Bilgileri sil” düğmesi açık sayfadaki cevapları temizler; daha önce indirilen dosyayı silmez.

## Sınırlar

- Konuşma tanıma, Chrome sağlayıcısının çevrimiçi hizmetini kullanabilir. Ses kalitesi cihazdaki Türkçe ses motoruna bağlıdır; bu uygulama yapay zekâ ses hizmeti içermez.
- Cevaplar yalnızca sayfa belleğinde tutulur; localStorage, veritabanı veya hastane sistemine yazılmaz. Sayfayı yenilemek cevapları siler. İndirme kullanıcı tarafından başlatılır.
- Geri okuyup onaylatma kimlik doğrulaması değildir. Dinleme/anlama beyanı işlem veya kontrast madde onamı ve imza yerine geçmez. Gerçek hastane kaydı için ayrıca yetkilendirilmiş sunucu ve kurum entegrasyonu gerekir.
- Kaynak fotoğraflardaki klinik metinler aktarılmıştır; tıbbi geçerlilik değerlendirmesi yapılmamıştır.

## Otomatik kontroller

Playwright ve Chromium bulunan geliştirme ortamında `node tests/browser.cjs` çalıştırın. Gerekirse Chromium konumunu `CHROMIUM_PATH` ile belirtin. Kontroller sayfayı yerel dosyalardan HTTP yanıtı gibi sunar; ses ve konuşma tanıma API’leri taklit edilir. Bunlar gerçek ses kalitesini, mikrofonu, Chrome’un çevrimiçi tanıma hizmetini veya GitHub Pages dağıtımını doğrulamaz.
