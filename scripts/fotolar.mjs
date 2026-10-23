// Ürün fotoğraflarını ve videolarını siteye ekler.
//
//   1. Fotoğrafları ve videoları fotograflar/<ürün-kodu>/ klasörüne koy
//      (iPhone HEIC, JPG, PNG; video için MOV, MP4). Dosya adı sırası = sitedeki sıra;
//      ilk fotoğraf kapak olur, videolar kapağın hemen ardından gelir.
//      Klasör adı ilanı söyler: "hobonichi - weeks - simli", "Paperora A5 Şeffaf" ya da
//      "paperora-a5-seffaf" hepsi olur.
//   2. npm run fotolar                  → klasöründe fotoğraf olan tüm ilanlar
//      npm run fotolar -- prev-a5-simli → sadece belirtilen ilan(lar)
//      npm run fotolar -- --tam         → klasörler eksiksiz: klasörü boş ilanın fotoğrafları kaldırılır
//
// Her ürün için: döndürme düzeltilir, uzun kenar 1400 px'e küçültülür, WebP'ye çevrilir,
// public/urunler/<ürün-kodu>/1.webp, 2.webp… olarak yazılır (o ürünün eski fotoğraflarının
// yerine geçer) ve ilanın fotoğraf listesi veritabanına (API → PATCH /yonetim/urun/<kod>/medya)
// kaydedilir. Videolar yüksek kalitede (sıkıştırma izi olmasın diye yüksek bit hızı,
// 1080p, sessiz) v1.mp4 + v1-h264.mp4 + v1.webp (kapak) olarak yazılır.
// Klasörde fotoğraf varsa fotoğraflar, video varsa videolar yenilenir; olmayan türe dokunulmaz.
//
// Gerekenler (macOS): swift (Xcode komut satırı araçları) ve cwebp (brew install webp).
// API: adres NEXT_PUBLIC_API_URL (yoksa .env.development.local), yönetim anahtarı
// ADMIN_TOKEN (yoksa api/config.php). Yayındaki API için:
//   NEXT_PUBLIC_API_URL=https://api.lemonacover.com ADMIN_TOKEN=... npm run fotolar

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const INBOX = path.join(ROOT, "fotograflar");
const OUT = path.join(ROOT, "public", "urunler");
const SWIFT = path.join(ROOT, "scripts", "foto-hazirla.swift");
const SWIFT_VIDEO = path.join(ROOT, "scripts", "video-hazirla.swift");
const VIDEO = /\.(mov|mp4|m4v)$/i;
const MAX_SIDE = 1400;
const QUALITY = 80;
const EXT = /\.(jpe?g|png|heic|heif|webp|tiff?)$/i;

/* ---------- API ---------- */

function envFile(file) {
  try {
    return Object.fromEntries(
      fs.readFileSync(path.join(ROOT, file), "utf8").split("\n")
        .map((l) => l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/)).filter(Boolean).map((m) => [m[1], m[2]]),
    );
  } catch {
    return {};
  }
}
const API = (process.env.NEXT_PUBLIC_API_URL || envFile(".env.development.local").NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
if (!API) {
  console.error("API adresi yok: NEXT_PUBLIC_API_URL ayarla (ör. http://localhost:8787).");
  process.exit(1);
}
function adminToken() {
  if (process.env.ADMIN_TOKEN) return process.env.ADMIN_TOKEN;
  try {
    return execFileSync("php", ["-r", 'echo (require "api/config.php")["admin_token"];'], { cwd: ROOT, encoding: "utf8" });
  } catch {
    console.error("Yönetim anahtarı yok: ADMIN_TOKEN ayarla (api/config.php → admin_token).");
    process.exit(1);
  }
}
async function saveMedia(slug, media) {
  const res = await fetch(`${API}/yonetim/urun/${slug}/medya`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify(media),
  });
  if (!res.ok) throw new Error(`${slug}: veritabanına kaydedilemedi (${res.status}) ${await res.text()}`);
}

// tüm ilanlar (gizliler dahil): yeni açılmış, henüz satışta olmayan ilanlara da fotoğraf eklenebilsin
let products;
try {
  const res = await fetch(`${API}/yonetim/urunler`, { headers: { Authorization: `Bearer ${adminToken()}` } });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  products = (await res.json()).products;
} catch (e) {
  console.error(`Ürün listesi alınamadı (${API}/yonetim/urunler): ${e.message}. API çalışıyor mu, anahtar doğru mu?`);
  process.exit(1);
}
const slugs = products.map((p) => p.slug);

// Klasör adı → ilan: "hobonichi - weeks - simli", "Paperora A5 Şeffaf" ya da "paperora-a5-seffaf"
const TR = { ç: "c", ğ: "g", ı: "i", i̇: "i", ö: "o", ş: "s", ü: "u" };
const slugify = (name) =>
  name
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşü]/g, (c) => TR[c])
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

fs.mkdirSync(INBOX, { recursive: true });
const dirs = new Map(); // ilan → klasör adı
for (const dir of fs.readdirSync(INBOX, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue;
  const slug = slugify(dir.name);
  if (!slugs.includes(slug)) {
    console.warn(`! "${dir.name}" klasörüne uyan bir ilan yok (${slug}), atlandı. İlanlar: ${slugs.join(", ")}`);
  } else if (dirs.has(slug)) {
    console.warn(`! "${dir.name}" ve "${dirs.get(slug)}" aynı ilana denk geliyor; ilki kullanıldı.`);
  } else {
    dirs.set(slug, dir.name);
  }
}
// klasörü olmayan her ilan için boş klasör hazır olsun
for (const s of slugs) {
  if (!dirs.has(s)) {
    fs.mkdirSync(path.join(INBOX, s), { recursive: true });
    dirs.set(s, s);
  }
}

// --tam: klasörler eksiksiz kabul edilir; klasörü boş olan ilanın fotoğrafları/videoları kaldırılır
const args = process.argv.slice(2);
const full = args.includes("--tam");
const only = args.filter((a) => a !== "--tam");
for (const s of only) {
  if (!slugs.includes(s)) {
    console.error(`"${s}" diye bir ilan yok. İlanlar: ${slugs.join(", ")}`);
    process.exit(1);
  }
}

const collator = new Intl.Collator("tr", { numeric: true, sensitivity: "base" });
const all = (only.length ? only : slugs).map((slug) => {
  const dir = path.join(INBOX, dirs.get(slug));
  const names = fs.readdirSync(dir).filter((f) => !f.startsWith(".")).sort(collator.compare);
  return { slug, dir, files: names.filter((f) => EXT.test(f)), videos: names.filter((f) => VIDEO.test(f)) };
});
const jobs = all.filter((j) => j.files.length || j.videos.length);

if (full) {
  for (const j of all.filter((x) => !x.files.length && !x.videos.length)) {
    const p = products.find((x) => x.slug === j.slug);
    if (!p.images.length && !p.videos.length) continue;
    await saveMedia(j.slug, { images: [], videos: [] });
    fs.rmSync(path.join(OUT, j.slug), { recursive: true, force: true });
    console.log(`– ${j.slug}: klasörü boş, fotoğrafları kaldırıldı`);
  }
}

if (!jobs.length) {
  console.log("fotograflar/ altındaki ilan klasörlerinde fotoğraf yok; yapılacak bir şey yok.");
  process.exit(0);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "lemona-foto-"));
try {
  // 1) hepsini tek seferde döndür + küçült (swift bir kez açılsın)
  const pairs = [];
  for (const j of jobs) {
    j.files.forEach((f, i) => {
      pairs.push(path.join(j.dir, f), path.join(tmp, `${j.slug}-${i + 1}.png`));
    });
  }
  if (pairs.length) {
    console.log(`${pairs.length / 2} fotoğraf hazırlanıyor…`);
    execFileSync("swift", [SWIFT, String(MAX_SIDE), ...pairs], { stdio: "inherit" });
  }

  // 2) WebP'ye çevir, eski fotoğrafların yerine koy, kataloğu güncelle
  for (const j of jobs) {
    const dest = path.join(OUT, j.slug);
    fs.mkdirSync(dest, { recursive: true });
    const media = {}; // veritabanına gidecek: images ve/veya videos

    // videolar: her biri ayrı ayrı (uzun sürebilir)
    if (j.videos.length) {
      for (const f of fs.readdirSync(dest)) if (/^v\d+(-h264)?\.(mp4|webp)$/i.test(f)) fs.rmSync(path.join(dest, f));
      media.videos = j.videos.map((f, i) => {
        const name = `v${i + 1}`;
        process.stdout.write(`  ${j.slug}: ${f} videosu hazırlanıyor… `);
        const info = execFileSync("swift", [SWIFT_VIDEO, path.join(j.dir, f), path.join(tmp, `${j.slug}-${name}`)], {
          encoding: "utf8",
          stdio: ["ignore", "pipe", "inherit"],
        }).trim();
        fs.copyFileSync(path.join(tmp, `${j.slug}-${name}.mp4`), path.join(dest, `${name}.mp4`));
        fs.copyFileSync(path.join(tmp, `${j.slug}-${name}-h264.mp4`), path.join(dest, `${name}-h264.mp4`));
        execFileSync("cwebp", ["-quiet", "-q", String(QUALITY), "-m", "6", "-metadata", "none",
          path.join(tmp, `${j.slug}-${name}-kapak.png`), "-o", path.join(dest, `${name}.webp`)]);
        const mb = (fs.statSync(path.join(dest, `${name}.mp4`)).size / 1048576).toFixed(1);
        console.log(`${info} · ${mb} MB`);
        return `/urunler/${j.slug}/${name}`;
      });
      console.log(`✓ ${j.slug}: ${j.videos.length} video`);
    }
    if (!j.files.length) {
      await saveMedia(j.slug, media);
      continue;
    }

    for (const f of fs.readdirSync(dest)) if (/^\d+\.webp$/i.test(f)) fs.rmSync(path.join(dest, f));
    const images = j.files.map((_, i) => {
      const name = `${i + 1}.webp`;
      execFileSync("cwebp", ["-quiet", "-q", String(QUALITY), "-m", "6", "-metadata", "none",
        path.join(tmp, `${j.slug}-${i + 1}.png`), "-o", path.join(dest, name)]);
      return name;
    });
    media.images = images.map((n) => `/urunler/${j.slug}/${n}`);
    await saveMedia(j.slug, media);
    const kb = images.reduce((t, n) => t + fs.statSync(path.join(dest, n)).size, 0) / 1024;
    console.log(`✓ ${j.slug}: ${images.length} fotoğraf (${Math.round(kb)} KB) — kapak: ${j.files[0]}`);
  }
  console.log(`Veritabanı güncellendi (${API}). Site, yeni fotoğrafları yüklenince hemen gösterir.`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
