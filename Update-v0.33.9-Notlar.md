# v0.33.9
Dashboard eski renk paletine geri döndü: A yeşil, B mavi-gri, C açık gri-mavi; Remaining eski kırmızı. Her tarih için A, B ve C aynı x konumunda üst üste çizilir. Aynı tarihte yalnız bir kategoride kapanış varsa o gün tek renk görünmesi normaldir. Tarih aralığı ve Last 7 days korunur.

Krastechnic Follow-Up önceki sürümde eklenen Google Sheet bağlantısını içerir. Admin girişinden sonra sekmede açılır, görünürken 5 dakikada bir yenilenir. Refresh elle yeniler; Open in Google Sheets asıl dosyayı açar. Bu gömülü görüntülemedir, veriler uygulama veritabanına aktarılmaz. Google paylaşım izinleri değiştirilmemiştir.

ZIP önceki frontend değişikliklerini içerir. İçeriğini mevcut frontend dosyalarının üzerine yükleyin (vendor dahil), sonra Ctrl+F5 yapın. v0.33.8'i ayrıca yüklemeye gerek yoktur. Backend değişmedi. Canlıya yüklenmedi.

Test: aynı gün A=2, B=3, C=4 örneğinde sütunların aynı x konumunda ve bitişik yüksekliklerde çizildiği doğrulandı; önceki renkler doğrulandı.
