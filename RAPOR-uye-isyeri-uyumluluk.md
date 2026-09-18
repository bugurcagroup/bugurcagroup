# Üye İşyeri (Banka / POS Denetimi) Uyumluluk Raporu

Proje: Buğurca Kırtasiye E-Ticaret Platformu
Tarih: 19.09.2026
Hazırlayan: Teknik Danışman (AI asistan)
Durum: **Kısmen tamamlandı — aşağıdaki maddeler için veri tedariki bekleniyor.**

---

## ÖZET

Banka üye işyeri denetiminde e-ticaret sitesinden istenen kurumsal şeffaflık ve
tüketici koruma unsurlarının durum kontrolü yapılmıştır.

1. Kod tarafında çözülebilen kritik eksik "künye görünürlüğü" sorunu **giderildi**
   (referans-kilitli müşteri vitrininde footer/künye artık her zaman görünüyor).
2. Geriye kalan maddelerin tamamı **işletmeye ait gerçek veri gerektiriyor**
   (şirket unvanı, vergi/mersis bilgileri, adres, sabit telefon, POS/alt üye işyeri
   yapılandırması, yasal metinler). Bu veriler tedarik edildikten sonra sitenin
   mevcut `StoreSettings` alanlarına girilecek ve otomatik olarak vitrin/footere
   yansıyacaktır.

---

## BÖLÜM 1 — KOD TARAFINDA TAMAMLANAN EKSİKLER (BU GÜN TESLİM EDİLDİ)

| # | Eksik | Yapılan | Dosya / Konum |
|---|------|---------|----------------|
| 1.1 | Müşteri vitrininde (referans linkiyle girilen kilitli görünümde) **künye/footer hiç görünmüyordu** | Footer künye bloğu artık her görünümde render ediliyor; referans-kilit koşulu kaldırıldı | `App.tsx` ~1373-1411 |
| 1.2 | Footer'da şirket künyesi yok | Künye bloğu eklendi: Şirket unvanı, Vergi Dairesi/No, MERSİS/Ticaret Sicil No, Merkez Adresi, Sabit Telefon, E-posta (mevcut alanlar `storeSettings`'ten, olmayanlar "Tedarik Edilecek" placeholder) | `App.tsx` ~1384-1392 |
| 1.3 | Footer'da yasal sayfa bağlantıları yok | 5 zorunlu yasal sayfa bağlantısı eklendi (Mesafeli Sözleşme, Ön Bilgilendirme, İptal-İade, KVKK Aydınlatma, Kargo-Teslimat) | `App.tsx` ~1396-1402 |
| 1.4 | Telefon/e-posta `tel:` ve `mailto:` tıklanabilir değildi | Tıklanabilir bağlantılar eklendi | `App.tsx` ~1405-1406 |

> 1.1 maddesi **kritikti**: Banka denetçisi platformu referans linki (bayi vitrini)
> üzerinden incelediğinde künyeyi **hiç göremiyordu**; bu, denetimde "künye eksik"
> notuna yol açan asıl kök nedendi. Artık her görünümde görünür.

---

## BÖLÜM 2 — VERİ TEDARİĞİ BEKLENEN EKSİKLER (KÜNYE ALANLARI)

> Aşağıdaki alanlar **işletmenin tüzel bilgilerini** gerektirir. Tedarik edilince
> `StoreSettings` üzerinden footer künyesine otomatik işlenecektir. Şu an
> "Tedarik Edilecek" olarak görünmektedir.

| # | Gerekli Veri | Örnek Format | Nereye Girilecek |
|---|--------------|--------------|------------------|
| 2.1 | **Şirket Unvanı** (ticari) | "X Kırtasiye San. ve Tic. Ltd. Şti." | `storeName` (ayrı tüzel unvan alanı önerilir) |
| 2.2 | **Vergi Dairesi** | "Kadıköy Vergi Dairesi" | Yeni künye alanı (tedarik sonrası) |
| 2.3 | **Vergi No** | "1234567890" | Yeni künye alanı |
| 2.4 | **MERSİS No** | "0123-4567-8900-0001" | Yeni künye alanı |
| 2.5 | **Ticaret Sicil No / Sicil Müdürlüğü** | "125634 / İstanbul TSO" | Yeni künye alanı |
| 2.6 | **Merkez / Açık Adres** (faaliyet adresi) | "Mah. Sok. No: Kat: Daire, İlçe/İl" | `contactAddress` (zaten var) |
| 2.7 | **Sabit Telefon** (fatura adresli) | "+90 212 555 44 33" | `contactPhone` (varsa) + yeni sabit tel alanı |
| 2.8 | **Kurumsal E-posta** | "info@buğurca.com" | `contactEmail` (zaten var) |
| 2.9 | **Çalışma Saatleri** | "Pzt-Cmt 09:00-19:00" | `contactWorkingHours` (zaten var) |

**İzlenecek adım:** Bu veriler tedarik edilince bana iletin; `StoreSettings` tipine
2.2-2.5 alanlarını ekleyip künyeye bağlayacağım. Lokal veri → Firestore ayar dokümanına
yazılıp footer'a yansıyacak.

---

## BÖLÜM 3 — VERİ TEDARİĞİ BEKLENEN EKSİKLER (YASAL METİNLER)

MeBvzuat gereği aşağıdaki yasal metinlerin **güncel ve işletmeye özgü haliyle** hazırlanması
gerekir. Bu metinler genellikle bir avukat / e-ticaret hukuk danışmanından (VEYA KVKK
uyum danışmanından) tedarik edilir. Tedarik edilen metinler sitenin yasal sayfalarına
konulacaktır (bağlantılar Bölüm 1.3'te hazır).

| # | Yasal Metin | Yasal Dayanak | Not |
|---|-------------|---------------|-----|
| 3.1 | **Mesafeli Satış Sözleşmesi** | 6502 s. Tüketicinin Korunması Hk. Kanun md. 48 | Onay kutucuğu zaten zorunlu (sipariş adımı) |
| 3.2 | **Ön Bilgilendirme Formu** | 6502 md. 48, Mes. Sat. Yön. md. 6 | Onay kutucuğu zaten zorunlu |
| 3.3 | **İptal-Koşulları / Cayma Hakkı** | 6502 md. 48; 14 gün cayma | Süre ve istisnalar net olmalı |
| 3.4 | **KVKK Aydınlatma Metni** | KVKK md. 10 | Üyelik onay kutucuğu zaten zorunlu |
| 3.5 | **Kargo ve Teslimat Koşulları** | 6502 md. 48 | Teslim süresi, kargo ücreti, gönderi takibi |
| 3.6 | **Çerez Politikası** | 6698 + Özel nitelikli bilgi rehberi | Bankalar genellikle ister |
| 3.7 | **Tüketici Hakem Heyeti / Bakırköy ibaresi** | 6502 md. 68 | Değer sınırına atıf |

**İzlenecek adım:** Metinleri tedarik edince paylaşın; her birine SPA içinde ayrı
yasal sayfa (mozgal/modal ve footer'dan menü) olarak ekleyeceğim. Metinler firma
bilgilerini de içerdiğinden Bölüm 2 ile birlikte girilir.

---

## BÖLÜM 4 — VERİ TEDARİĞİ / KURULUM BEKLEYEN (ÖDEME & POS)

| # | Eksik | Açıklama |
|---|------|----------|
| 4.1 | **Sanal POS / Ödeme Kuruluşu** | Bankanın onayını aldıktan sonra POS entegrasyonu (ör. iyzico, PayTR, banka API) yapılacaktır. Şu an siparişler banka havalesi/EFT + onay akışı olarak ilerliyor. |
| 4.2 | **Alt üye işyeri (alt POS) yapılandırması** | Platform "esnaf + merkez" modelinde olduğundan, bayilerin kendi POS'ları için alt üye işyeri numaraları bankadan tedarik edilecek. |
| 4.3 | **Fatura / e-Fatura / e-Arşiv** | GİB yazılımı veya entegratör (e-fatura sistemi) tedarik edilecek; KDV'li net fiyatların faturaya bağlanması. |
| 4.4 | **Banka hesap (ticari)** | IBAN / hesap bilgisi künye ve ödeme yönergelerine işlenecek. |

---

## BÖLÜM 5 — ÖNERİLEN TAMAMLAYICI DÜZENLEMELER (KOD / İÇERİK)

> Bunlar büyük oranda koddan yapılabilecek iyileştirmelerdir; onay verirseniz bir
> sonraki adımda tek tek uygulanabilir.

| # | Düzenleme | Gerekçe |
|---|-----------|---------|
| 5.1 | Test/lorem içeriklerin temizlenmesi (ürün açıklamaları, fiyat "0,00 TL" örnekleri) | Denetimde test verisi itibarı zedeler |
| 5.2 | Fiyatların KDV dâhil, net TL olarak + stok durumunun ("Stokta var / Tükendi") ürün kartında belirtilmesi | Tüketicinin bilgilendirilmesi (6502) |
| 5.3 | Sipariş onay ekranında yasal metinlerin okunup onaylandığı checkbox'ların ayrı görselleştirilmesi | Bankalar ispatlanabilir onay ister (şu an fonksiyonel olarak zorunlu) |
| 5.4 | `robots.txt`, `sitemap.xml`, SSL (https) doğrulaması | Teknik itibar |

---

## SONRAKİ ADIMLAR (TEDARİK SONRASI)

1. **Bölüm 2** künye verilerini iletin → `StoreSettings` ekleme + footer bağlama.
2. **Bölüm 3** yasal metinleri (avukat/uyum danışmanı) iletin → yasal sayfalar.
3. **Bölüm 4** POS/alt-POS/e-fatura bilgileri bankadan gelince → ödeme entegrasyonu.
4. **Bölüm 5** kodu uygulamak istediğiniz maddeleri onaylayın.

---

*Bu rapor, mevcut MVP simulasyonun banka üye işyeri denetimine hazırlık için
çıkarılmıştır; yasal danışmanlık niteliği taşımaz.*
