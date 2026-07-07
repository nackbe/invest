"use client";

// Primitivas de UI del simulador: mobile-first, tema oscuro, superficies planas (§5).

import { formatCOPShort } from "@/lib/format";

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display?: (v: number) => string;
}) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm text-neutral-400">{label}</span>
        <span className="text-sm font-medium tabular-nums text-neutral-100">
          {display ? display(value) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-800 accent-emerald-500"
      />
    </label>
  );
}

/** Alias para montos: muestra el valor en formato corto de pesos. */
export function MoneySlider(props: Omit<Parameters<typeof Slider>[0], "display">) {
  return <Slider {...props} display={formatCOPShort} />;
}

export function Toggle({
  left,
  right,
  value, // false = left, true = right
  onChange,
}: {
  left: string;
  right: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-neutral-800 bg-neutral-900 p-0.5 text-sm">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-md px-3 py-1 transition ${!value ? "bg-neutral-100 text-neutral-900" : "text-neutral-400"}`}
      >
        {left}
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-md px-3 py-1 transition ${value ? "bg-neutral-100 text-neutral-900" : "text-neutral-400"}`}
      >
        {right}
      </button>
    </div>
  );
}

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex w-full rounded-lg border border-neutral-800 bg-neutral-900 p-0.5 text-sm">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-2 py-1.5 transition ${
            value === o.value ? "bg-neutral-100 font-medium text-neutral-900" : "text-neutral-400"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function BigNumber({
  value,
  caption,
  sub,
}: {
  value: string;
  caption?: string;
  sub?: string;
}) {
  return (
    <div className="text-center">
      {caption && <div className="text-sm text-neutral-400">{caption}</div>}
      <div className="text-5xl font-bold tracking-tight text-emerald-400 tabular-nums sm:text-6xl">
        {value}
      </div>
      {sub && <div className="mt-1 text-sm text-neutral-500">{sub}</div>}
    </div>
  );
}
