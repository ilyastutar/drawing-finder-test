# Drawing Finder v0.10.0

Kaynaklar: kullanıcının gönderdiği frontend v0.9.0.1 ve backend v0.8.2.

## Kurulum

1. Backend ZIP'ini yeni bir klasöre çıkarın. Mevcut deploy.sh yapılandırmasını kontrol edin; Cloud Shell'de `unset DF_ACCESS_KEY` ardından `bash deploy.sh` çalıştırın. Mevcut Secret Manager anahtarı kullanılır.
2. Frontend ZIP'indeki dört dosyayı birlikte yayınlayın: index.html, search.html, kks-dictionary.js, kks-validator.js. Aynı klasörde olmalılar.
3. Tarayıcıda Ctrl+F5 yapın. Önce backend, sonra frontend güncellenmelidir.

## Arama

Tag, Drawing (dosya adı VE yol) ve Pipeline büyük/küçük harften bağımsız contains arar. D/R/P/T + Tab, Excel paste, chip'ler ve Related Tag korunur. Row tam sayı eşleşmesidir. Chip sonuçlarında gerçek bulunan tag gösterilir.
Eski Firestore kayıtlarıyla çalışır: arama için yeniden OCR veya sync gerekmez. Yeni drawing-suggest, drawing-records ve search-mode uçları v0.8.2 backend'e eklendi. HTML/404/boş/geçersiz JSON yanıtları anlaşılır hata verir; HTML ekrana basılmaz. Bilinmeyen backend uçları JSON 404 döndürür.

Arama mevcut kayıtları 500'lük sayfalarla tarar; yalnızca ilk sayfayı veya prefix adaylarını filtrelemez. Sonuç kesilirse arayüz bunu belirtir. 50.000 kayıt tarama tavanı aşılırsa eksik sonuç yerine açık hata döner. Büyük koleksiyonlarda Firestore okuma maliyeti/gecikmesi artar; ayrı bir contains arama indeksi önerilir. Batch en fazla 500 sorgu, sorgu başına 150 sonuç döndürür. Her batch koleksiyonu bir kez tarar.

## KKS kapsamı

Kaynak: kullanıcının yüklediği DE303-200-EG-GDL-00001, Rev.04, 09/08/2023.
Sözlük girdilerinde PDF sayfası, kaynak metin satırı ve listed/free ayrımı tutulur. Annex 1 function/equipment/component anahtarları ayrı ad alanlarıdır. Kaynak açıklamaları satır bazında çıkarılmıştır; çok satırlı açıklamalar tam çeviri değildir.

- Bölüm 5.6, s.33-34: G ve F0 ayrı rakamlar; proje prefix listesi. Başka prefix'ler (ör. I&C 40) silinmez, bağlamsal incelemeye bırakılır.
- Bölüm 6, s.36-63: G/F0/F1-F3/FN/A1-A2/AN/opsiyonel A3/B1-B2/BN ayrıştırılır. Pump örneği 00NDC21 AP001 KP01 desteklenir.
- Bölüm 7, s.64-69: C/D/F için proje A2 ölçüm büyüklükleri, 900-929 / 930-959 / 960-999 ölçüm bağlantı sınıfları. Ana doküman kuralı Appendix genel anahtarına önceliklidir.
- Bölüm 8, s.70-72 ve Annex 1 PDF s.275-279: sistem/kabin düzeyi ve -M01/-U01 gibi electrical component anahtarları. Kurulum yeri nokta/ayraç biçimleri ve detay mühendislik kuralları tamamen doğrulanmış sayılmaz; REVIEW olarak korunur.
- Annex 1 PDF s.105-266 function, 267-274 equipment, 275-279 component. Serbest alt bölümlere otomatik geçerlilik verilmez.

Bu katman bir ekipmanın sahada gerçekten mevcut olduğunu veya tüm mühendislik kurallarına uygunluğunu kanıtlamaz. CONSISTENT = uygulanan yapı/sözlük kontrolleri uyumlu. Puan kural tabanlıdır, olasılık değildir. Bilinmeyen kodlar, kısmi/özel biçimler ve serbest alt gruplar REVIEW olur; hiçbir kayıt filtrelenmez.

OCR correction: yalnızca rakam konumunda tek O→0, I/L→1 veya S→5 hatası ve sözlük/proje kontrolleri uyumluysa aday önerilir. Orijinal tag, pipeline, row ve related değerleri otomatik değiştirilmez. Harf-harf belirsizlikleri, birden çok hata ve eksik karakterler tahmin edilmez. Bu koruma mevcut OCR çekirdeğine müdahaleyi önler.

KKS değerlendirmesi indexer sonuçlarında görünür, yeni yerel kayıtlarda ve cloud sync'te saklanır. Eski cloud tag'leri arama yanıtında anlık değerlendirilir. Eski kayıtlar için toplu veri migrasyonu yapılmaz. Pipeline değerlendirmesi yalnızca KKS başlangıcı içindir; DN/malzeme/drawing son eki mevcut çekirdeğe bırakılır. Mevcut CSV şeması korunur.

## Doğrulama

Backend klasöründe Node.js 20+ ile `npm test` çalıştırın. Testler harici OCR/Firestore bağlantısı gerektirmez; API testleri Firestore yerine kontrollü örnek veri kullanır. JavaScript syntax, PDF örnekleri, düzeltme belirsizlikleri, sayfa 1 sonrasındaki contains sonucu, sonuç sınırı, batch, related tag, drawing/row/pipeline uçları ve HTML/JSON hata durumları kapsanır.

Orijinal frontend OCR kaynak kodunun yalnızca başlık, modül yükleme, metadata serialization ve sonradan eklenen gösterim dışında birebir korunduğu doğrulandı. Gerçek Cloud Run/Firestore üzerinde deploy, canlı yük testi ve ücretli OCR çağrısı yapılmadı.
