import { ScreenApp } from "@/components/screen/ScreenApp";
export default function Screen({ params }: { params: { code: string } }) {
  return <ScreenApp code={params.code.toUpperCase()} />;
}
