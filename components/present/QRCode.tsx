"use client";

import { useEffect, useState } from "react";
import QR from "qrcode";

/** QR generado en cliente (§3, presentador §10.5). */
export function QRCode({ value, size = 240 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string>("");

  useEffect(() => {
    QR.toDataURL(value, { width: size, margin: 1, color: { dark: "#0a0a0a", light: "#ffffff" } })
      .then(setSrc)
      .catch(() => setSrc(""));
  }, [value, size]);

  if (!src) return <div style={{ width: size, height: size }} className="rounded-lg bg-neutral-800" />;
  return <img src={src} width={size} height={size} alt="QR del simulador" className="rounded-lg" />;
}
