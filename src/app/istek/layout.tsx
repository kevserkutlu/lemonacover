import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Özel istek",
  description:
    "Ajandan listede yoksa ya da özel ölçüyse adını ve fotoğrafını gönder; dikebiliyorsam fiyatıyla sana dönerim.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
