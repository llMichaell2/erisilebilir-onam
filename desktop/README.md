# Windows masaüstü kaynakları

Windows Forms ve Microsoft Edge WebView2 üzerinde çalışan yönetim uygulaması. Hasta/QR ekranı için publicSiteUrl kullanılır.

Windows PowerShell ile derleme: ./desktop/build.ps1 -WebViewPackage C:/paket/webview2 -OutputDirectory C:/derleme/KentOnam

Microsoft.Web.WebView2 1.0.4314.35 NuGet paketi kullanılarak test edildi. NuGet paketi ve DLL dosyaları kaynak depoya eklenmez.

EXE --smoke C:/calisma/smoke parametreleriyle açıldığında giriş ekranını yükler, Windows uygulaması etiketini doğrular ve belirtilen çalışma klasörüne smoke-ok.txt ile ekran görüntüsü yazar. Gerçek personel hesabına giriş yapmaz ve hasta kayıtlarını değiştirmez.
