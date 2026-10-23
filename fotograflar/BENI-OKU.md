# Ürün fotoğrafları ve videoları

Fotoğrafları ve videoları ilan klasörlerine koy, sonra şunu çalıştır:

```
npm run fotolar
```

- **Her klasör bir ilan.** Şeffaf ve simli kılıf ayrı ilan, o yüzden ayrı klasör.
  Klasör adını istediğin gibi yazabilirsin, şunların hepsi olur:
  `hobonichi - weeks - simli`, `Paperora A5 Şeffaf`, `paperora-a5-seffaf`.
- Klasöre uyan bir ilan yoksa komut uyarır; yeni ilanı önce veritabanında açmam
  gerekiyor (fiyatı belli olmayan ilan gizli açılır).
- Telefondan geldiği gibi koyabilirsin: fotoğraf için HEIC, JPG, PNG; video için
  MOV, MP4. Fotoğraf sayısında sınır yok. Döndürme, küçültme ve dönüştürme otomatik.
- **Videolar:** simlerin parıltısı net görünsün diye yüksek kalitede hazırlanır
  (1080p, normal sitelerin birkaç katı bit hızı, ses kaldırılır). 5–15 saniye yeter.
- Sıra dosya adına göre; **ilk fotoğraf kapak olur**, videolar kapaktan hemen
  sonra gelir. Sırayı sen belirlemek istersen dosyaları `1`, `2`, `3`… diye adlandır.
- Klasörde fotoğraf varsa o ilanın sitedeki fotoğrafları **tamamen** bunlarla,
  video varsa videoları **tamamen** bunlarla değişir. Boş klasöre dokunulmaz;
  `npm run fotolar -- --tam` dersen boş klasörlü ilanların fotoğrafları kaldırılır.
- **Fotoğrafı olmayan kılıf türü** (ör. simlinin fotoğrafı var, şeffafın yok) ana
  sayfada ayrı ilan olarak görünmez. Ürün sayfasında şeffaf seçilse de simlinin
  fotoğrafları kalır, sadece fiyat değişir. Fotoğrafını ekleyince kendi ilanı açılır.
- Sadece bir ilanı güncellemek için: `npm run fotolar -- prev-a5-simli`
- Bu klasördeki orijinaller git'e girmez; siteye hazırlanmış kopyalar gider.
