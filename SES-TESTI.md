# Sesli akış doğrulaması

Otomatik dinleme açıkken, tarayıcının normal oturum sonlandırması veya `no-speech` hatasından sonra 600 ms beklenerek yeniden dinlenir. Önceki cevap korunur. Bir dinleme zincirinde en çok altı otomatik yeniden başlatma yapılır; toplam süre cevapta 240 saniye, doğrulamada 45 saniyedir. Süre veya deneme sınırı dolunca kullanıcı mikrofon düğmesiyle devam edebilir.

Durdur, yazmaya başlama, sekmeyi gizleme, sıfırlama, sessiz mod ve otomatik dinlemeyi kapatma bekleyen yeniden başlatmayı iptal eder. Ağ hatasında otomatik dinleme açıksa ve sayfa görünürse 1,8 saniye sonra yalnızca bir kez yeniden denenir. İzin ve mikrofon hataları otomatik tekrar edilmez. Kesilen oturumun geç gelen sonuçları yok sayılır. Geçici sonuçlarla onay verilmez.

Ad-soyadda tanıma hizmetinin eklediği noktalama temizlenir; Türkçe harfler, çok parçalı adlar, kısa adlar, kesme işareti ve birleşik adlardaki tire korunur. Hasta söylediği ad-soyadı geri okumada doğrular; uygulama ismi tahmin ederek değiştirmez. Cevap sonunda “tamam” veya “bitti” denmelidir.

## Otomatik kontroller

- `node tests/speech-recovery.cjs`: duraksama, oturum kapanması, geç sonuçlar, tekrar sınırı, iptal, geçici onay, yazıdan sese geçiş ve ad-soyad çeşitleri.
- `node tests/auto-listen.cjs`: soru ve onay akışı, düzeltme, yavaş rakamlar, tarih ve son beyan.
- `node tests/browser.cjs`: Chrome içinde telefon ekranı boyutuyla ad ve T.C. cevabını düğmeye basmadan kesilen oturumdan sürdürme; tüm form ve PDF.
- `node tests/numbers.cjs`, `node tests/spoken-dates.cjs`: rakamlar ve Türkçe tarihler.
- `node tests/accessibility.cjs`: otomatik erişilebilirlik ve ekran boyutu kontrolleri.

Tanıma olayları testlerde taklit edilir. Gerçek mikrofon ve hizmet doğruluğu bu testlerle ölçülmez.

## Tanıtım öncesi gerçek cihaz denemesi

Chrome bilgisayar, Chrome Android ve Safari iPhone üzerinde ayrı ayrı deneyin:

1. “Öykü” deyip birkaç saniye bekleyin; “Işıl Çığ Şener, tamam” ile bitirin. Tam ad geri okunmalı ve hasta onaylamadan sonraki soruya geçilmemeli.
2. Adı yanlış söyleyip geri okumada “hayır” deyin. Ad-soyad sorusu yeniden açılmalı.
3. T.C. ve telefonu rakamları tek tek, aralarda duraksayarak söyleyin. Doğum tarihini “beş … ekim … iki bin … beş … tamam” olarak deneyin.
4. Konuşurken Durdur'a basın veya sekmeyi değiştirin. Mikrofon kendiliğinden yeniden açılmamalı.
5. Mikrofon iznini reddedin veya bağlantıyı kesin. Açıklayıcı mesaj görünmeli; yazılı cevapla devam edilebilmeli.
6. “Okudum, anladım, onaylıyorum” sonrasında geri okumayı dinleyip “onaylıyorum” deyin. Tamamlanma ve PDF indirmeyi kontrol edin. “Onaylamıyorum” işlemi tamamlamamalı.

Tarayıcının Türkçe konuşma tanıma hizmetindeki ağ/kullanılabilirlik sorunlarını uygulama ortadan kaldıramaz. Gerçek hasta bilgileri yerine test verileri kullanın.

Tarih-saat otomatik doldurulur; soru akışı beş sorudur. Gerekirse son beyandan önce “Tarih ve saati düzelt” düğmesiyle tarih-saat düzenlenip doğrulanır. “Doğru doğru” gibi tekrarlar otomatik tarihi silmez ve son beyan yerine geçmez.

Son beyanda başlangıçta veya cümle içinde tekrarlanan olumlu sözcükler kabul edilir; örneğin “Onaylıyorum okudum anladım onaylıyorum”. Okudum–anladım–onaylıyorum sırası ve ayrı son doğrulama gerekir. Yalnızca “onaylıyorum” ilk aşamada yeterli değildir; tam beyan yeniden istenir. Olumsuz veya ek belirsiz sözcükler içeren cümleler kabul edilmez. Tamamlanmamış geçerli cümleler biriktirilir; geçersiz denemede açıklama yapılıp temiz bir denemeye geçilir.

## Konuşma servisi bağlantı hatası

Network hatası, tarayıcının tanıma servisine erişemediğini belirtir; normal web sayfalarının açılması bu servisin de erişilebilir olduğunu kanıtlamaz. Otomatik deneme en fazla bir kez yapılır, önceki cevap korunur. Durdur, yazı modu, sekme gizleme, tekrar dinleme veya manuel mikrofon başlatma bekleyen denemeyi iptal eder. Çevrimdışı durumda otomatik deneme yapılmaz. Geçici bir “evet” sonucu, bağlantı kesilince onay sayılmaz.

Yazıyla devam et düğmesi otomatik dinlemeyi kapatır ve cevap alanını açar; hasta telefon klavyesinin sesle yazma özelliğini de kullanabilir. Sağlık sorularında Bilmiyorum yazılabilir ve ayrı değer olarak saklanır. Bu iyileştirme erişilemeyen konuşma servisini sağlayıcı tarafında onarmaz; gerçek cihazda farklı bağlantıyla karşılaştırmalı test gerekir.

## Kısa yönlendirme ve sağlık yanıtını düzeltme

Evet / Hayır / Bilmiyorum yönergesi sağlık bölümünün başında bir kez okunur; soruyu tekrar dinlemek bu yönergeyi tekrarlamaz. Sağlık ana sorularında, otomatik dinleme açıkken yanıt geri okunduktan ve mikrofon gerçekten başladıktan sonra 6 saniyelik düzeltme aralığı açılır. Bu sırada Hayır veya Yanlış denirse soru yeniden sorulur. Konuşma başlangıcı, geçici sonuç, hata, durdurma veya gizlenen sekme otomatik geçişi iptal eder. Belirsiz bir söz veya bağlantı hatasından sonra sessizlik onay sayılmaz; açık doğrulama gerekir. Kimlik bilgileri, açıklamalar ve son beyan bu otomatik geçişten yararlanmaz. Sessiz/yazılı modda doğrulama düğmeleri kullanılır.

Barkod oluşturuldu mesajı yalnızca sunucu kaydı ve QR çizimi başarılı olduktan sonra seslendirilir. Kaydetme hatasında veya bilgiler temizlendikten sonra geç dönen yanıtta başarı mesajı söylenmez.
