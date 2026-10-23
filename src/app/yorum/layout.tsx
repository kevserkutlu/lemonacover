import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yorum yaz",
  description: "Kılıfını aldıysan teşekkür kartındaki kodla yorumunu ve fotoğraflarını paylaş.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
