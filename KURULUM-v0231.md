# v0.23.1 — Oturum ve kolon gizleme

Bu paket v0.23.0 üzerine uygulanır. Backend değişikliği yoktur; Cloud Shell komutu çalıştırmanız gerekmez.

1. ZIP'i bilgisayarınızda açın.
2. İçindeki 5 kod dosyasını (search.html, index.html, project-access.js, punch-browser.js, punch-workspace.css) GitHub reposunun ana dizinine yükleyerek mevcutlarını değiştirin. Vendor klasörüne dokunmayın.
3. Commit changes açıklaması: `Keep sessions for 10 hours and add column header hide buttons`.
4. GitHub Pages yayını bittikten sonra Ctrl+F5 yapın ve bir kez yeniden giriş yapın.

E-posta, Google ve Microsoft girişleri aynı tarayıcıda giriş anından itibaren 10 saat hatırlanır. Sayfa yenileme, yeni sekme ve aynı tarayıcıyı yeniden açma oturumu sıfırlamaz. Yenileme 10 saatlik süreyi uzatmaz. Sign out oturumu temizler ve diğer açık sekmelere de yansır. Süre dolunca tekrar giriş gerekir. Yönetici hesabı devre dışı bırakırsa veya Firebase oturumu iptal ederse daha erken giriş istenebilir.

Parolanız saklanmaz. Firebase yenileme kimliği ve bitiş zamanı tarayıcının yerel depolamasında tutulur; kullanıcı rolü her yeniden açılışta backend'den kontrol edilir. Tarayıcının site verilerini silmek veya özel taramayı kapatmak kayıtlı oturumu silebilir. Geçici bağlantı hatasında kayıtlı oturum korunur; Check access again ile tekrar deneyebilirsiniz.

Her kolon başlığının sağında küçük üzeri çizili göz düğmesi bulunur. Buna basınca o kolon gizlenir. Gizlenenleri Export filtered yanındaki Columns menüsünden işaretleyerek veya Show all ile geri getirebilirsiniz. En az bir kolon görünür kalır. Gizlemek filtreyi temizlemez; Excel export ve kopyalama görünür kolonları kullanır.

Yerel Chrome testleri: e-posta ve iki sosyal giriş, sayfa yenileme, yeni sekme, sekmeler arası çıkış, sabit süre, süre dolumu, iptal edilmiş oturum, geçici ağ hatası ve kolon başlığından gizleme/geri açma geçti. Sosyal sağlayıcılar ve backend testlerde taklit edildi; canlı hesabınızla giriş test edilmedi.

Firebase oturum modeli: https://firebase.google.com/docs/auth/admin/manage-sessions
