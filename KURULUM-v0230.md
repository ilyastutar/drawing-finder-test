# TOP Punch v0.23.0 — v0.22.1 üzerine güncelleme

Bu paket yerel olarak test edildi. Cloud Run'a veya GitHub'a sizin adınıza yüklenmedi.
Fotoğraflar mevcut özel **europe-west1 / Belçika** alanında kalır.

## 1. Önce backend

Cloud Shell'in dosya yükleme menüsünden **top-punch-backend-v0.23.0.zip** dosyasını ana klasörünüze yükleyin. Ardından:

```bash
unzip -o ~/top-punch-backend-v0.23.0.zip -d ~/top-punch-update-v0230
python3 ~/top-punch-update-v0230/install.py ~/top-punch-backend-v0180
bash ~/top-punch-update-v0230/deploy0230.sh ~/top-punch-backend-v0180
```

Klasör adının sonu **v0180**. Komutları sırayla çalıştırın; birinde hata olursa sonraki adıma geçmeyin. Bilgisayarınıza Python kurmanız gerekmez; Python yalnızca Cloud Shell'de kullanılır.

Kurucu değişen backend dosyalarını, package.json ve varsa package-lock.json dosyasını yan klasörde `drawing-backup-TARIH` adıyla yedekler. Tekrar çalıştırılabilir. v0.20/v0.21/v0.22 backend yapısını destekler. Mevcut Firebase, Power Automate ve diğer ortam ayarlarını korur. Fotoğraf alanını herkese açmaz.

Dağıtım sonunda `serving 100 percent of traffic` mesajını görün. Kontrol:

```bash
curl -fsS https://drawing-finder-ocr-api-639231007303.europe-west1.run.app/health
```

Yanıtta `release: 0.23.0` bulunmalı. Bu kontrol tek başına fotoğraf ve Firestore yetkilerinin doğrulandığı anlamına gelmez; aşağıdaki ekran kontrollerini de yapın.

## 2. Frontend

**top-punch-frontend-update-v0.23.0.zip** dosyasını bilgisayarınızda açın.
İçindeki şu 9 dosyayı GitHub reposunun **ana dizinine**, mevcut search.html ile aynı yere yükleyip değiştirin:

- search.html
- project-access.js
- project-access.css
- punch-browser.js
- punch-collaboration.js
- punch-extras.js
- punch-extras.css
- punch-workspace.js
- punch-workspace.css

GitHub: repo ana sayfası → Add file → Upload files → bu dokuz dosyayı seçin → Commit changes.
Commit açıklaması örneği: `Add photo gallery, admin audit, notifications and column controls`.

Bu **güncelleme paketi** v0.22.1'in üzerine kurulur. Vendor klasörüne dokunmanız gerekmez. Daha önceki photo-optimizer.js dosyası yerinde kalmalı. Backend ZIP'ini, Excel verilerinizi veya fotoğrafları GitHub'a yüklemeyin.

GitHub Pages yayını tamamlandıktan sonra siteyi **Ctrl+F5** ile yenileyip tekrar giriş yapın. Ana sayfada **v0.23.0** yazmalı.

## 3. Gelen özellikler

### Fotoğraflar

- v0.22.1'deki yükleme öncesi otomatik küçültme korunur.
- Punch detayında fotoğrafa tıklayın. Önceki/Sonraki düğmeleri, klavyedeki sağ/sol oklar, fotoğrafın sağ/sol tarafına tıklama ve telefonda yatay kaydırma desteklenir.
- Ana tablo fotoğraf önizlemesi solda, en fazla **1140 px** genişliğinde açılır; önceki 380 px sınırının üç katıdır. Ekranda yer azsa sığacak şekilde küçülür. Sol tarafta yer yoksa tablonun üstünde yer açılır; Description alanını kapatmaz.
- Önizlemede fotoğraflar arasında geçiş ve **Full screen** düğmesi vardır. Açılan büyük görüntüde ayrıca tarayıcı tam ekranı bulunur.
- Fotoğraflar ihtiyaç duyulduğunda alınır; bütün fotoğraf arşivi sayfa açılışında indirilmez.

### Arayüz ve kolonlar

- Punch detayındaki **Close** düğmesi kaydırma sırasında erişilebilir kalır.
- Kullanıcı adı belirgin arka planla gösterilir.
- **Export filtered** yanındaki **Columns** menüsünden her kolonu gizleyebilir/gösterebilirsiniz. En az bir kolon görünür kalır.
- **Show all** tüm kolonları geri getirir. Tercih aynı tarayıcıda hatırlanır.
- Gizlenen kolonun filtresi uygulanmaya devam eder; menü bunu açıkça belirtir. Kopyalama ve Excel export görünür kolonları kullanır.

### Admin silme ve işlem kaydı

- Punch içindeki yorum ve fotoğraflarda **Delete comment / Delete photo** yalnızca adminlere görünür. Backend de admin rolünü kontrol eder.
- Silme öncesinde onay sorulur. Kaydın yerine adminlere silen kişinin adı ve tarih/saat gösterilir. Normal kullanıcılar silinen kayıtları görmez.
- Silinen yorumun metni ve fotoğraf dosyaları denetim kaydı için saklanır. **Bu işlem depolama alanını boşaltmaz.** Silinen fotoğraf normal görüntüleme adresinden artık alınamaz.
- Son yorum silinirse ana tablodaki özet, varsa bir önceki silinmemiş yoruma döner.
- Bu sürümde geri yükleme veya kalıcı fotoğraf temizleme düğmesi yoktur.

### Bildirimler

- Kullanıcı adının yanındaki **Notifications** düğmesi geçmişi açar.
- Yeni hesap: kullanıcı e-postasını doğrulayıp uygulamaya ilk kez eriştiğinde adminlere onay bildirimi oluşur.
- Yeni yorum: onaylı tüm kullanıcılar için bildirim oluşur. Yorum metni bildirim kaydına kopyalanmaz.
- Kapanan punch: **Follow closure notifications** ile takip edenlere bildirim oluşur. Yorum yapan kullanıcı o punch'ı otomatik takip eder; aynı düğmeyle takipten çıkabilir.
- Kapanış, mevcut statü kuralıyla **Open → Closed** değişikliğidir. Power Automate Excel importu başarıyla yayınlandığında kaydedilir. İlk yükleme bütün eski kapalı punch'lar için bildirim üretmez. Aynı kapalı kayıt tekrar bildirim üretmez.
- Bildirimler site açıkken yaklaşık **60 saniyede bir** kontrol edilir; sekme gizliyken kontrol durur. Yeni olay yoksa tüm geçmiş yeniden okunmaz. **Older notifications** eski kayıtları getirir; sayaç yüklenmiş geçmişteki okunmamış kayıtları sayar.
- Ses varsayılan açık, **Sound on · mute** ile kapatılır. Tercih kullanıcı ve tarayıcı bazında saklanır. Tarayıcı kısıtları gereği ses ilk tıklama/klavye etkileşiminden sonra başlayabilir. İlk girişte geçmiş bildirimler için ses çalmaz.
- Bu uygulama içi bildirimdir; site kapalıyken telefon/işletim sistemi push bildirimi veya e-posta göndermez.

### Depolama paneli

1. Admin olarak sağ üstte **Photo storage** düğmesine basın.
2. **Measure current usage** ile mevcut alanı ölçün.
3. İsterseniz **Upload limit (GiB)** alanına sınır yazıp **Save settings** deyin. Varsayılan **0**, yani uygulama sınırı yoktur.
4. İlgili kutu açıksa sınırın %90'ında yalnızca güncel Excel verisinde Open olan punch'lara yükleme kabul edilir. Sınırı aşacak yeni yükleme tüm punch'larda engellenir. Statü tarayıcıdan değil backend'deki güncel kayıttan doğrulanır.

Gösterilen maliyet, Standard depolama için **0,02 USD/GiB/ay** üzerinden tahmindir; gerçek fatura değildir. Kullanım sabit kalırsa aylık saklama maliyetini gösterir. İşlemler, veri transferi, diğer servisler ve vergiler dahil değildir. Avrupa'daki bu özel alanın 5 GB ücretsiz olduğu varsayılmaz.

Kaynak: https://cloud.google.com/storage/pricing (27 Eylül 2026'da kontrol edildi).

Ölçüm mevcut fotoğraf alanındaki canlı nesneleri kapsar; uygulamada silinmiş fakat saklanan fotoğraflar dahildir. GCS eski nesne sürümleri ve GCS tarafından soft-delete edilmiş nesneler dahil değildir. Google Cloud'un Billing ekranı gerçek ücretler için esas alınır. Uygulama limiti Google faturalandırmasını durdurmaz; panel dışından depoya yüklenen dosyalar için yeniden ölçüm gerekir.

Yükleme sırasında alan rezerve edilir. Bağlantı hatası olursa aynı fotoğrafı tekrar yükleyin. Admin panelinde **Unfinished upload** görünürse, işlem aktif değilken **Cancel unfinished upload** ile yalnızca tamamlanmamış yüklemenin geçici dosyaları temizlenebilir. Kaydedilmiş punch fotoğrafları bu işlemle silinmez. Aktif işlemler için beş dakika beklenir. İptal eden admin ve tarih de kaydedilir.

## 4. Kurulum sonrası kısa kontrol

- Birden fazla fotoğraflı punch'ta ok ve kaydırma ile geçişi deneyin.
- Bir test yorumu yazıp admin olarak silin; silme kaydını görün.
- Columns ile bir kolonu gizleyip tekrar açın.
- Photo storage → Measure current usage ile alanı görün; istemiyorsanız limiti 0 bırakın.
- Bir punch'ı takip edin. Bir sonraki başarılı Excel importunda bu punch Open'dan Closed'a değişirse bildirim gelmeli.
- Bildirim panelinden sesi kapatıp açın ve yüklenen bildirimleri okundu işaretleyin.

## 5. Doğrulama ve sınırlar

Yerel testlerde gerçek JPEG sıkıştırma akışı, admin/reader/writer erişimi, soft-delete kayıtları, eşzamanlı depolama sınırı, başarısız yükleme tekrarı/iptali, gerçek XLSX importu, bildirim tekrarının önlenmesi, masaüstü/mobil galeri ve ekranlar doğrulandı. Mevcut arama, filtreler, Excel export ve dashboard regresyon testleri geçti. OCR handler kurucu testinde değişmeden kaldı.

Canlı Cloud Run, Firestore ve Cloud Storage bağlantıları bu ortamdan yetkili olarak çalıştırılmadı. Dağıtım sonrası yukarıdaki kontrolleri yapın. Ek Firestore composite index gerektiren bir sorgu kullanılmadı; ortamınız bir index uyarısı döndürürse hata metnini paylaşın.
