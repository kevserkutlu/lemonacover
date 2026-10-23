"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useCart } from "@/lib/cart";
import { ApiError, confirmTestPayment } from "@/lib/api";

// Sanal POS bağlanana kadar ödeme adımını taklit eden sayfa.
function TestPayment() {
  const params = useSearchParams();
  const router = useRouter();
  const { clear } = useCart();
  const orderId = params.get("siparis") ?? "";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const confirm = async () => {
    setBusy(true);
    try {
      await confirmTestPayment(orderId);
      clear();
      router.replace(`/siparis/?no=${encodeURIComponent(orderId)}&yeni=1`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Ödeme onaylanamadı.");
      setBusy(false);
    }
  };

  return (
    <div className="wrap section" style={{ maxWidth: 520, display: "grid", gap: 18 }}>
      <p className="notice">
        Test modu: sanal POS henüz bağlı değil. Bu sayfa bankanın ödeme ekranının
        yerini tutuyor; kart bilgisi istemiyorum, para çekilmiyor.
      </p>
      <h1 style={{ fontSize: "2rem" }}>Ödeme</h1>
      <p className="muted">Sipariş no: {orderId}</p>
      {error ? <p className="field__error" role="alert">{error}</p> : null}
      <button className="btn" onClick={confirm} disabled={busy || !orderId}>
        {busy ? "Onaylanıyor…" : "Test ödemesini onayla"}
      </button>
      <button className="link-btn" onClick={() => router.push("/odeme")}>
        Ödeme sayfasına dön
      </button>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <TestPayment />
    </Suspense>
  );
}
