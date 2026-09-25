# TOP Punch v0.22.0 — birleşik güncelleme

Bu paket mevcut v0.20.0 backend + v0.20.1 frontend üzerine kurulur. v0.21.0 ZIP/DWG/DCC değişiklikleri dahildir; onu önce kurmana gerek yok. v0.21.0 kuruluysa da kullanılabilir. Yerel bilgisayarına Python kurman gerekmiyor; aşağıdaki işlemler Google Cloud Shell'de yapılır.

## 1. Backend kurulumu

`top-punch-backend-v0.22.0.zip` dosyasını Cloud Shell'de **Upload file** ile ana klasörüne yükle. Ardından:

```bash
unzip -o ~/top-punch-backend-v0.22.0.zip -d ~/top-punch-update-v0220
python3 ~/top-punch-update-v0220/install.py ~/top-punch-backend-v0180
```

Başarılı kurulumdan sonra:

```bash
bash ~/top-punch-update-v0220/deploy0220.sh ~/top-punch-backend-v0180
```

Bu komut bağımlılık kilidini günceller, europe-west1 bölgesinde özel fotoğraf depolama alanını oluşturur, yalnızca Cloud Run servis hesabına fotoğraf okuma/yazma izni verir ve backend'i yayımlar. Mevcut Firebase, Power Automate ve OCR ortam ayarlarını korur. Bir komut hata verirse sonraki adımlar çalışmaz; hata çıktısını paylaş.

Kontrol:

```bash
curl -fsS https://drawing-finder-ocr-api-639231007303.europe-west1.run.app/health
```

Çıktıda `"release":"0.22.0"` ve `"drawingMetadata":true` bulunmalı.

## 2. Frontend kurulumu

1. `top-punch-frontend-v0.22.0.zip` dosyasını bilgisayarında aç.
2. İçindeki web dosyalarını GitHub `drawing-finder-test` deposunun mevcut dosyalarının üzerine yükle. ZIP dosyasının kendisini yükleme.
3. `vendor` klasörünü alt klasörleriyle birlikte koru. Özellikle `vendor/dwg/libredwg-web.wasm` ve `vendor/wasm/libredwg-web.js` gereklidir.
4. Fotoğrafları, kablo Excel dosyalarını, backend dosyalarını veya eski özel veri JSON dosyalarını frontend deposuna koyma.
5. GitHub Pages yayını tamamlandığında siteyi açıp **Ctrl+F5** yap. Giriş yaptıktan sonra v0.22.0 görünmeli.

## 3. Fotoğrafları yükleme

Fotoğraflar mevcut isimleriyle kullanılabilir. Web sitesi Z: sürücüsünü kendiliğinden taramaz.

1. Yönetici veya yazma yetkili hesapla giriş yap.
2. Punch ekranında **Import photos** düğmesine bas.
3. Dosya seçme ekranında `Z:\General\00_ TOP Photos` klasörünü aç. Bir seferde en fazla 100 JPEG/PNG/WebP seç; alt klasörlerdeki dosyaları ayrı seçebilirsin.
4. Eşleştirme listesini incele. Örneğin `DE303-500-SU-NFI-00001-26 -1-Closed.JPG`, NFI `DE303-500-SU-NFI-00001` ve Walkdown Item `26` ile eşleşir. Testte Punch 37 bulundu.
5. **Upload matched photos** düğmesine bas. Eşleşmeyen veya birden fazla punch'a eşleşen dosyalar atlanır. Bunları ilgili punch detayındaki Photos bölümünden elle yükleyebilirsin.
6. İstersen `7632-1.jpg`, `7632-2.jpg` gibi punch numarasıyla da adlandırabilirsin. Punch numarası birden fazla kayıtta varsa otomatik eşleştirme yapılmaz.

Bir punch'a en fazla 50 fotoğraf, dosya başına en fazla 15 MB ve 50 megapiksel desteklenir. Detaydan yüklemede bir seferde 10 fotoğraf seçilebilir. Aynı dosyanın aynı punch'a tekrar yüklenmesi kopya oluşturmaz. Dosya adındaki `Closed` ifadesi punch durumunu değiştirmez.

Orijinaller Z: klasöründe kalır; sunucuda 360 piksel önizleme ve en fazla 1920 piksel büyük WebP kopyası tutulur. Ana tablo fotoğrafları önceden indirmez. Fotoğraf sütununa gelince küçük önizleme, punch detayında fotoğrafa tıklayınca büyük görüntü açılır. Telefonda dokunarak açılır.

Depolama herkese kapalıdır. Görüntüler giriş ve kullanıcı yetkisi kontrol edilen backend üzerinden sunulur. Google Cloud Storage için uniform erişim ve public access prevention etkinleştirilir: https://docs.cloud.google.com/storage/docs/public-access-prevention . Depolama/istek/trafik kullanımı Google Cloud faturasına yansır; sabit ücretsiz kullanım sözü verilmez.

## 4. Yeni kullanım

- Tam ekranda üstteki hesap şeridi saydamdır, üst boşluk azaltılmıştır. Çıkış sağ alttaki **Exit full screen** ile yapılır; Esc seçim modunu kapatır.
- Google/Microsoft giriş düğmelerine logolar eklendi. Firebase sağlayıcı ayarlarını yeniden yapmana gerek yok.
- **Electrical A/B · Open** düğmesi Open + Electrical/I&C + A/B filtresi uygular; mevcut subsystem ve diğer filtrelerini korur. Üç ilgili kolondaki önceki filtrelerin yerini alır.
- **Latest Comment**, son yorumu ve yazar/tarih bilgisini gösterir. Üzerinde 1,5 saniye durunca geçmiş açılır; tıklama/dokunma ile de açılır. Eski yorumlar ilk istekte bir defa özetlenir. Başkalarının yorumları yaklaşık bir dakika içinde yenilenir.
- **Cable Completion** sütunundan `Both side termination completed` seçip Status `Open` filtresi ekleyebilirsin. Punch içinde açıkça geçen kabloların tamamında pulled/from term/to term tarihleri varsa tamamlandı gösterilir. Bir tarih veya kablo kaydı eksikse tamamlandı sayılmaz. Kablo referansı olmayan punchlar ayrı görünür.
- Kablo penceresinde FROM/TO ayrı gösterilir. Tarih olmayan alanlar **No date** yazar. Eski tag/kablo eşleştirme verisi tarih içermiyorsa bu güncelleme tarih uydurmaz; güncel kablo Excel listelerinin mevcut import akışıyla yüklenmesi gerekir.
- ZIP/PDF/DWG yükleme yönetici OCR sayfasındadır. DCC, Drawing Number, Tag Number ve ek metadata önceki v0.21.0 geliştirmesiyle birlikte gelir. DWG'de raster/proxy öğeler okunamayabilir; böyle bir çizimde PDF kullan. Örnek DWG'de 992 benzersiz tag ve BLD010 bulundu; dosya okuyucu uyarısı 68 ayrıca gösterilir.

## 5. Doğrulama ve sınırlar

Yerel testlerde gerçek fotoğraf adlandırması ve küçültme, FROM/TO düzeltmesi, yorum geçmişi, fotoğraf erişim izinleri, kopya yükleme önleme, filtre/kopyalama/Excel çıktısı, mobil görünüm, dashboard ve DCC akışı kontrol edildi. Örnek 4,26 MB fotoğrafın önizlemesi 6 KB, büyük kopyası 203 KB oldu; diğer fotoğraflarda boyut değişir.

Bu paket senin adına canlıya yayımlanmadı; Z: klasöründen buluta fotoğraf yüklenmedi. Firestore/Storage canlı entegrasyonu ve gerçek Google OCR yanıtı dağıtımdan sonra kendi hesabında doğrulanmalıdır. Backend kurucusu değiştirdiği dosyaların yedeğini kurulum sırasında yazdırır. Sorunda Cloud Run'da önceki revision'a trafik yönlendirilebilir; yerel kaynakları geri almak için yazdırılan yedekteki dosyalar geri konur. Yeni fotoğraf/yorum verilerini silmek gerekmez.
