"use client";

import { useMemo } from "react";
import { InputIcon } from "@/components/erp/input-icon";

interface CurrencyInputProps {
  value: number | null | undefined;
  onValueChange: (value: number | null) => void;
  currency?: string;
  locale?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function parseNumeric(input: string): number | null {
  const cleaned = input.replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Currency-friendly input for amounts (fixsystem phase 2.3). */
export function CurrencyInput({
  value,
  onValueChange,
  currency = "YER",
  locale = "en-US",
  placeholder,
  disabled,
  className,
}: CurrencyInputProps) {
  const suffix = useMemo(() => currency.toUpperCase(), [currency]);
  const textValue = value == null ? "" : String(value);

  return (
    <InputIcon
      inputMode="decimal"
      dir="ltr"
      value={textValue}
      placeholder={placeholder ?? "0.00"}
      disabled={disabled}
      className={className}
      endIcon={<span className="text-[10px] font-semibold">{suffix}</span>}
      onChange={(e) => onValueChange(parseNumeric(e.target.value))}
      onBlur={(e) => {
        const n = parseNumeric(e.target.value);
        if (n == null) {
          e.currentTarget.value = "";
          return;
        }
        const formatted = new Intl.NumberFormat(locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
          useGrouping: false,
        }).format(n);
        e.currentTarget.value = formatted;
      }}
    />
  );
}
