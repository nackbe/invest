import { PlayerApp } from "@/components/play/PlayerApp";

export default function Home({ searchParams }: { searchParams: { code?: string } }) {
  return <PlayerApp initialCode={(searchParams.code ?? "").toUpperCase()} />;
}
