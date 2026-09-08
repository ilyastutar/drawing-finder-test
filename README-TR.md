# Drawing Finder v0.11.0

## Kurulum
Önce backend ZIP'ini Google Cloud Shell'e yükleyin:

```bash
cd ~
unzip -o drawing-finder-v0.11.0-backend.zip -d drawing-finder-v0.11.0-backend
cd drawing-finder-v0.11.0-backend
unset DF_ACCESS_KEY
bash deploy.sh
```

Ardından frontend ZIP'indeki index.html, search.html, kks-dictionary.js ve kks-validator.js dosyalarını aynı klasöre yayınlayın. Ctrl+F5 yapın. Yeniden OCR gerekmez.

## Davranış
- Her moda geçildiğinde boş kutunun altında gerçek proje kayıtlarından en fazla 6 örnek görünür. Yeterli kayıt yoksa mevcut sayı gösterilir. Örnekler uydurulmaz.
- Drawing örneği seçilince drawing kayıtları açılır. Tag/Pipeline/Row örneği seçilince o değer aranır.
- Drawing'de yazmaya başlayınca bütün contains eşleşmeleri gelir: 12/50 gibi toplam sonuç sınırı yoktur. Veriler backend'de 500'lük sayfalarla okunur. Çok büyük drawing koleksiyonlarında yanıt süresi artabilir.
- Açık gri/beyaz tema, sarı vurgular, silik vinç ve elektrik panosu çizimleri, görünür mod düğmeleri, kaydırılabilir öneri alanı.
- Tag/Pipeline mevcut contains araması, Row tam sayı araması, Excel paste ve related tag korunur. Tag/Pipeline sonuç sınırları önceki sürümdeki gibidir; bu değişiklik Drawing öneri/arama sınırını kaldırır.
- KKS validator ve mevcut OCR çekirdeği korunur. Indexer sürüm başlığı v0.10.0 kalır; search arayüzü ve backend v0.11.0'dır.

## Doğrulama
29 test geçti: önceki 27 kontrol, boş Drawing için 6 örnek / yazılan sorgu için 80 sonucun tamamı, tüm diğer modlarda gerçek ve farklı örnekler.
Inline script syntax ve backend syntax kontrolü geçti. Açık tema yerel tarayıcıda örnek verilerle görsel olarak incelendi. Canlı backend henüz deploy edilmedi; yerel önizlemede cloud CORS nedeniyle canlı veri kullanılmadı.
Backend klasöründe `npm test` ile testleri tekrar çalıştırabilirsiniz. Test fixture'ları pakete dahildir; veritabanına bağlanmazlar.
