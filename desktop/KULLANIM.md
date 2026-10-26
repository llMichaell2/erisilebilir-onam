# Kent Onam — Windows Yönetim Uygulaması

Paketin tamamını ZIP'ten bir klasöre çıkarın ve KentOnam-Yonetim.exe dosyasını çift tıklayarak açın. EXE, DLL dosyaları ve ui klasörü birlikte kalmalıdır.

Windows 10/11 64 bit, .NET Framework 4.6.2 veya üzeri ve Microsoft Edge WebView2 Runtime gerekir. Test bilgisayarında WebView2 ile açılış doğrulandı. WebView2: https://developer.microsoft.com/microsoft-edge/webview2/

Bu imzasız bir proje/deneme sürümüdür; kurumsal kod imzası içermez.

## Giriş ve kayıtlar

Supabase Authentication içinde oluşturulan personel e-postası ve şifresiyle giriş yapın. Web yönetim paneliyle aynı hesap kullanılır. İnternet bağlantısı gerekir. Oturum açıkken kayıtlar yaklaşık 15 saniyede bir yenilenir. Hasta formu: https://llmichaell2.github.io/erisilebilir-onam/

Hasta QR kodları herkese açık HTTPS belge adresini içerir. Yerel uygulama adresi QR içine yazılmaz. Şifreler pakete kaydedilmez; oturum uygulama belleğinde tutulur. WebView2 profil/önbelleği Windows kullanıcısının LocalAppData/KentOnam dizinindedir.

## Arşivleme kurulumu

Supabase SQL Editor'da arsiv-kurulum.sql dosyasının tamamını bir kez çalıştırın. Kurulum tamamlanmadan uygulama mevcut kayıtları gösterir; arşivleme düğmeleri pasif kalır.

Aktif formlar listesinden kayıt seçip Seçilenleri arşive kaldır düğmesine basın. Açılan pencerede isimleri kontrol edip onaylayın. Form verileri veya QR anahtarları silinmez. Hasta aynı QR ile formuna erişebilir. Arşiv sekmesinden kayıtlar ana listeye geri alınabilir. İşlemi yapan personelin kimliği ve zamanı veritabanında tutulur. Liste her görünümde son 100 kaydı gösterir.

Üniversitenin veya e-Nabız'ın resmî sağlık uygulaması değildir; İstanbul Kent Üniversitesi öğrenci projesidir. Logo ve dekoratif Taksim görseli kent.edu.tr kaynaklarından alınmıştır. Microsoft WebView2 ve QR bileşenlerinin lisansları pakette bulunur.

## Ana sayfa ve mola kilidi

Üstteki Kent logosu veya sol menüdeki Ana sayfa düğmesi, uygulama içindeki tanıtım sayfasını açar. Slaytlar 10 saniyede bir değişir; duraklatma, önceki ve sonraki düğmeleri kullanılabilir. Azaltılmış hareket tercihinde otomatik geçiş kapalı başlar. Üniversite bağlantısı uygulamada ayrı pencerede açılır.

Molada / Kilitle düğmesi mevcut personel oturumunu kapatır, hasta listesini temizler ve uygulama içinden açılan belge pencerelerini kapatır. Kilit penceresinde aynı personel hesabının şifresi yeniden Supabase ile doğrulanır. Yanlış şifre veya ağ hatasında kayıtlar açılmaz. Kilit penceresinden çıkış yaparak ana sayfaya dönüp başka hesapla giriş yapılabilir. Bilgisayardaki başka programları kilitlemek için Windows kilidini kullanın.

Ana sayfa ve giriş ekranında 9 tanıtım slaytı bulunur. Yönetim menüsündeki kompakt “İnsana dair” kutusunda 8 söz 12 saniyede bir yumuşak geçişle değişir; ileri, geri ve duraklatma düğmeleri kullanılabilir. Azaltılmış hareket tercihinde otomatik geçişler kapalıdır. Hasta formuna söz eklenmez.

## Bağlantı ve oturum yenileme

Geçici bağlantı veya sunucu hatasında oturum kapatılmaz. Varsa son yüklenen kayıtlar gösterilir; arşiv işlemleri liste yeniden doğrulanana kadar kapalıdır. Ekrandaki Yenile düğmesiyle tekrar deneyebilirsiniz. Oturumun yenileme anahtarı geçersizse veya personel yetkisi kaldırılmışsa yeniden giriş gerekir. Şifreler ve oturum anahtarları diske kaydedilmez; uygulamayı kapatıp açınca yeniden giriş yapılır.
