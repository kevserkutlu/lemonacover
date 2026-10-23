# Dolap yorumları

Dolap yorumları web sitesinde görünmüyor, sadece uygulamada açılıyor. Bu yüzden:

1. Dolap uygulamasında profilindeki **Değerlendirmeler** bölümünü aç.
2. Yorumların ekran görüntülerini al (bir ekranda birkaç yorum olabilir, sorun değil).
3. Görüntüleri bu klasöre koy ve Claude'a "dolap yorumlarını ekle" de.

Görüntülerden kullanıcı adını ve yorum metnini okuyup `src/data/reviews.ts`
dosyasına ekliyorum; sitede kullanıcı adları kısaltılarak (Ma•••ur gibi) görünür.
Bu klasördeki görüntüler git'e girmez.
