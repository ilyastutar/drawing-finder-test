# v0.34.0 — Krastechnic canlı karşılaştırma

## Neler değişti?
Krastechnic Follow-Up artık gömülü Google görünümü değildir. Punch Item tasarımına uygun, sabit başlıklı bir tablodur. Tüm dolu başlıklı kaynak kolonlar, sütun bazında metin/değer filtresi, genel arama, sıralama, kolon gizleme/taşıma/genişlik ayarı, filtreli kayıt sayacı, kopyalama ve 100 satırlık sayfalama içerir. Punch numarasına basınca ana Punch Item sekmesi o numaraya filtrelenir; geri düğmesi ile dönüş yapılabilir.

Ana Punch Item sekmesine koyu başlıklı dört alan eklendi:
- Krastechnic / Responsible
- Krastechnic / Status
- Krastechnic / Comment-1
- Krastechnic / Comment-2

Varsayılan konumları ana Status kolonunun yanıdır. Daha önce kaydedilmiş kolon sırası varsa profil tercihi korunur; gerekirse kolonları taşıyabilirsiniz. Bu alanlar da ana tablonun mevcut filtre, gizleme, kopyalama ve dışa aktarma işlevlerini kullanır.

## Eşleştirme
Tek anahtar Punch Item No. Subsystem, açıklama veya satır konumu eşleştirme koşulu değildir. Numara eşleşmesi tamdır; 123 ile 1234 eşleşmez. Baştaki/sondaki boşluklar ve sayısal Excel gösterimi normalize edilir. Kaynakta bulunmayanlar Not found in Krastechnic olarak görünür. Aynı numarada dört alanın değerleri çelişiyorsa rastgele bir satır seçilmez; Multiple conflicting rows — check Krastechnic gösterilir. Aynı değerleri taşıyan tekrar kayıtlar tek anlamlı eşleşme sayılır.

23 Ekim 2026 kontrolü: Google kaynağında 1.811 satır, 24 başlıklı kolon okundu. 13656 (kaynak satır 1065/1066) ve 13703 (1093/1094) numaralarında çelişen tekrar kayıtlar var. Bu satırlar Krastechnic tablosunda numarayla filtrelenebilir.

Google Status ile ana projenin Open/Closed durumu ayrı kalır; bu güncelleme punch kapatmaz veya yeniden açmaz. Krastechnic tablosundaki Project / Open/Closed kolonu karşılaştırma içindir. Hiçbir Google hücresine yazılmaz.

## Senkronizasyon ve erişim
Admin oturumu açıldığında okuma başlar. Sayfa görünürken 60 saniyede bir kontrol edilir; sekmeye dönünce de kontrol edilir. Refresh ile yeniden okuma istenir. Backend aynı sunucu örneğinde 60 saniyelik ortak önbellek kullanır, manuel isteklerde 5 saniyelik alt sınır vardır. Google tarafındaki önbellekleme nedeniyle tam anlık teslim garantisi yoktur. Veriler farklıysa iki tablo birlikte güncellenir; filtreler korunur.

Last data change detected, uygulamanın değişiklik tespit ettiği zamandır; Google dosyasının gerçek son değiştirilme tarihi değildir. Last successful check son başarılı okumadır. Başarısız okumada varsa son başarılı bellek kopyası uyarıyla gösterilir; sunucu yeniden başlarsa bu önbellek yoktur. Tarayıcıda kalıcı Krastechnic verisi saklanmaz.

Krastechnic sekmesi ve ek kolonlar şimdilik yalnız adminlerde görünür. /api/krastechnic servisi de admin rolünü kontrol eder. Google dosyasının kendi paylaşım izinleri değiştirilmedi; mevcut bağlantıyla okunabilen dosya kullanılır. Paylaşımı Kısıtlı yaparsanız bu bağlantı erişim hatası gösterecektir; o durumda ayrıca yetkili Google bağlantısı kurulmalıdır. Power Automate, yeni API anahtarı veya Google dosyasını yeniden yayınlama gerekmez.

## Kurulum — iki paket de gerekli
Bu paketler mevcut kuruluma uygulanan kümülatif güncellemelerdir; sıfırdan kurulum değildir. Önce backend güncellemesini mevcut backend kaynak klasörünün üzerine uygulayıp yeniden deploy edin. Sonra frontend ZIP içeriğini mevcut GitHub Pages dosyalarının üzerine yükleyin; vendor dahil klasörleri koruyun. Ctrl+F5 ile yenileyin. 0.33.8/0.33.9 frontend paketlerini ayrıca yüklemeniz gerekmez.

Daha önce kullandığınız Cloud Shell klasörü aynıysa örnek komutlar:

```sh
cd ~/top-punch-backend-v0180
unzip -o ~/top-punch-backend-update-v0.34.0.zip -d .
gcloud run deploy drawing-finder-ocr-api --source . --region europe-west1 --project drawing-finder-ocr
```

ZIP'i önce Cloud Shell'e yükleyin. Klasör adınız farklıysa mevcut backend kaynak klasörünüzü kullanın. Bu çalışma kapsamında canlıya deploy yapılmadı.

## Testler
CSV tırnakları, virgüller ve çok satırlı yorumlar; tam Punch No. eşleşmesi; subsystem farklı olsa da eşleşme; eksik/çelişen/aynı değerli tekrarlar; veri değişikliği, önbellek, bağlantı hatası ve toparlanma; admin yetkisi; profil kolon tercihleri test edildi. Yerel tarayıcıda filtre, ana Punch Item'a geçiş/geri dönüş, iki tablodaki eşzamanlı değer güncellemesi ve reader hesabında gizleme doğrulandı. Gerçek Google kaynağı salt okunur olarak alındı. Ekran görüntülerindeki ana proje Open/Closed değerleri test verisidir. Google dosyasında test değişikliği yapılmadı.

Google bağlantısı hakkında resmi kaynak: https://developers.google.com/chart/interactive/docs/spreadsheets
