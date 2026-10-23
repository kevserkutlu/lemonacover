"use client";

// Telefondan gelen büyük fotoğrafları yüklemeden önce küçültür (en fazla 1600 px,
// JPEG) ve sepette göstermek için küçük bir önizleme üretir.

async function load(file: File): Promise<CanvasImageSource & { width: number; height: number }> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {}
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

function draw(src: CanvasImageSource & { width: number; height: number }, max: number) {
  const scale = Math.min(1, max / Math.max(src.width, src.height));
  const c = document.createElement("canvas");
  c.width = Math.round(src.width * scale);
  c.height = Math.round(src.height * scale);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff"; // şeffaf PNG'lerin arkası siyah olmasın
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

export async function prepareImage(file: File) {
  const img = await load(file).catch(() => {
    throw new Error("Bu dosya açılamadı. JPG ya da PNG bir görsel dene.");
  });
  const big = draw(img, 1600);
  const blob: Blob = await new Promise((res, rej) =>
    big.toBlob((b) => (b ? res(b) : rej(new Error("Görsel hazırlanamadı."))), "image/jpeg", 0.85),
  );
  const thumb = draw(img, 160).toDataURL("image/jpeg", 0.7);
  return { blob, thumb };
}
