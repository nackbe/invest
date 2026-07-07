import type { Metadata } from "next";
import { Presenter } from "@/components/present/Presenter";

export const metadata: Metadata = {
  title: "Presentador · Invierte",
  description: "Modo presentación para la capacitación en vivo.",
};

export default function PresentPage() {
  return <Presenter />;
}
