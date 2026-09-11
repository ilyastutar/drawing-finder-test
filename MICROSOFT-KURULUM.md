# TOP Punch Closure v0.18.0

Kod eklendi; canlı Microsoft bağlantısı ve otomatik sunucu görevi henüz kurulmadı. Mevcut canlı backend değiştirilmedi.

## Çalışma şekli

- Kullanıcı araması açık kalır. `/api/public/punch` punch satırlarını herkese açık sunar. Kullanıcı bu paylaşımı onayladı.
- Microsoft şifresi uygulamada kullanılmaz. Bağlantı sahibi Microsoft ekranında giriş yapar.
- Token önbelleği AES-256-GCM ile şifrelenip Firestore `top_punch_private/connection` içinde tutulur. Anahtar Secret Manager üzerinden sunucuya verilir; frontend veya ZIP içinde bulunmaz.
- Firestore istemci kuralları `top_punch_private` ve `top_punch_snapshots` koleksiyonlarına doğrudan istemci erişimini engellemelidir. Geniş kapsamlı mevcut allow kuralları varsa daraltılmadan canlıya geçilmemelidir. Bu pakette mevcut Firestore kuralları incelenmedi/değiştirilmedi.
- G (Location) VEYA H (Description) eşleşmesi alınır; H her durumda gösterilir. A item numarası, O kapanış tarihidir. Boş tarih Open, geçerli tarih Closed, yorumlanamayan değer Review olur. Satır rengi tek başına kapanış kabul edilmez.
- Sayfa açıkken beş dakikada bir sorgular. Backend beş dakikalık kontrol önbelleği ve dosya eTag kontrolü kullanır. Dosya değişmemişse yeniden indirmez. Başarısız güncellemede son başarılı kayıtlar stale uyarısıyla kalır.
- Sayfa kapalıyken çalışması için ayrı sunucu zamanlayıcısı kurulmalıdır; Cloud Run içinde setInterval çalıştığı varsayılmaz.

## Microsoft tarafı

1. Entra uygulama kaydı oluşturun: yalnızca şirket tenant'ı, platform Web.
2. Redirect URI: `https://BACKEND-ADRESI/auth/microsoft/callback`.
3. Microsoft Graph delegated `Files.Read` izni kullanılır. Şirket politikası onay isteyebilir. Dosya yetkisi ayrıca bağlantı hesabında bulunmalıdır. İzin yetersizse tenant yöneticisi incelemelidir; uygulama otomatik geniş izin istemez.
4. Tenant ID, Client ID ve bağlantıyı yapacak kişinin Object ID'sini alın. Başka bir hesapla giriş bağlantıyı değiştiremez.
5. İlgili Excel'in Graph Drive ID ve Item ID değerlerini belirleyin; paylaşım URL'sindeki sourcedoc değeri Graph Item ID yerine kullanılamaz.

## Sunucu ortam değişkenleri

Gizli olmayan: MS_TENANT_ID, MS_CLIENT_ID, MS_OWNER_OBJECT_ID, MS_REDIRECT_URI, MS_DRIVE_ID, MS_ITEM_ID.

Secret Manager üzerinden: MS_CLIENT_SECRET ve PUNCH_ENCRYPTION_KEY (rastgele 32 baytın base64 değeri). Mevcut DF_ACCESS_KEY yönetici bağlantı ekranını ve sync adresini korur. Gizli değerleri sohbet, GitHub, frontend, ZIP veya loglara yazmayın.

Tüm değerler tamamlanmazsa entegrasyon kapalı kalır. HTTPS zorunludur. Şifreli tokenlar korunurken şifreleme anahtarını değiştirmek yeniden Microsoft girişi gerektirir.

Backend'i yeni dosyalar ve bağımlılıklarla deploy edin. Eski deploy.sh Microsoft değerlerini otomatik oluşturmaz. Yeni frontend ZIP'i yayınlayın. Backend adresi değişirse search.html içindeki API değerini düzenleyin.

Backend adresinin sonuna `/auth/microsoft` ekleyin. Buraya Microsoft şifrenizi değil mevcut Cloud administration key'i girin; sonra Microsoft giriş ekranında oturum açın. İlk veri sorgusu Excel'i okur.

## Kesintisiz beş dakikalık kontrol

Sunucu zamanlayıcısının beş dakikada bir `POST /api/punch/sync` çağırması gerekir. İstek `X-DF-Key` yönetim başlığını taşımalıdır; bu başlık tarayıcıya verilmemelidir. Zamanlayıcı yapılandırmasına erişimi yalnızca yöneticilerle sınırlayın. Alternatif olarak kurumun OIDC korumalı zamanlayıcı aracısı kullanılabilir. Bu görev henüz oluşturulmadı.

Firestore `top_punch_snapshots.expiresAt` için TTL temizliği etkinleştirin: eski nesiller yedi gün sonra temizlenir. Güncel neslin eTag değişmese de ömrü yenilenmelidir; bu sürüm güncel nesli süresiz tutar, yalnızca yerine geçen nesillere TTL yazar.

## Kontroller ve kalanlar

Mevcut OCR/arama testleri ve yeni şifreleme/eşleştirme kontrolleri çalıştırıldı. Gerçek indirilen Excel'de 15.476 satır okundu; örnek 12LBA11GH102 → item 13246, Closed doğrulandı.

Gerçek tenant ile OAuth giriş/token yenileme, Graph dosya indirme, Firestore IAM/istemci kuralları ve zamanlayıcı uçtan uca testi henüz yapılamadı. Kurulumdan sonra bu kontroller tamamlanmadan sürekli senkronizasyonun aktif olduğu kabul edilmemelidir.
