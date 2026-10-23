"use client";

// /urun/?id=<slug> — build'den sonra veritabanına eklenen ilanlar için.
// (Build'de var olan ilanların kendi sayfası var: /urun/<slug>/)

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import ProductView from "./ProductView";

function ById() {
  const id = useSearchParams().get("id") ?? "";
  return <ProductView slug={id} setTitle />;
}

export default function Page() {
  return (
    <Suspense>
      <ById />
    </Suspense>
  );
}
