import type { Metadata, Viewport } from "next";
import "./globals.css";
import { fontVariables } from "./fonts";
import { CartProvider } from "@/lib/cart";
import { CatalogProvider } from "@/lib/CatalogProvider";
import { getCatalog } from "@/lib/catalogServer";
import { site } from "@/data/site";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Glitter from "@/components/Glitter";
import PaperDefs from "@/components/PaperDefs";
import BackToTop from "@/components/BackToTop";

export const metadata: Metadata = {
  metadataBase: new URL(`https://${site.domain}`), // bağlantı önizlemelerindeki görseller için
  title: {
    default: "lemona cover — şeffaf ajanda kılıfları",
    template: "%s · lemona cover",
  },
  description:
    "Hobonichi, Paperora, Prev, Youna ve myPath ajandalar için elde diktiğim şeffaf ve simli kılıflar. Ajandan listede yoksa fotoğrafıyla sor.",
};

export const viewport: Viewport = {
  themeColor: "#faf6e9",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // ürünler veritabanından (PHP API) — build sırasında sayfaya gömülür, tarayıcıda tazelenir
  const catalog = await getCatalog();
  return (
    <html lang="tr" className={fontVariables}>
      <body>
        <PaperDefs />
        <CatalogProvider initial={catalog}>
          <CartProvider>
            <Header />
            <main>{children}</main>
            <Footer />
            <Glitter />
            <BackToTop />
          </CartProvider>
        </CatalogProvider>
      </body>
    </html>
  );
}
