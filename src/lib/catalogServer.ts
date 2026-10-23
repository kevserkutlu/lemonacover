import { cache } from "react";
import { fetchCatalog } from "./catalog";

// Build sırasında sayfalar hazırlanırken katalog API'den alınır (aynı sayfa içinde bir kez).
// Next, build'de çekilen veriyi .next/cache/fetch-cache'te saklayıp sonraki build'lerde
// tekrar kullanır; eski fiyat/ilan gelmesin diye `npm run build` öncesi (prebuild) bu
// klasör silinir. Build'i `npm run build` ile al.
export const getCatalog = cache(() => fetchCatalog());
