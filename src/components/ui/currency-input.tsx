"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps
  extends Omit<React.ComponentProps<"input">, "value" | "onChange"> {
  /** Valor numérico (string ou number), ex.: "1234.56". */
  value: string | number | null | undefined;
  /** Recebe o novo valor como string numérica, ex.: "1234.56". */
  onValueChange: (value: string) => void;
}

/** Input de moeda BRL com máscara baseada em centavos. */
export function CurrencyInput({
  value,
  onValueChange,
  className,
  ...props
}: CurrencyInputProps) {
  const display =
    value === "" || value === null || value === undefined
      ? ""
      : Number(value).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, "");
    if (!digits) {
      onValueChange("");
      return;
    }
    const cents = parseInt(digits, 10);
    onValueChange((cents / 100).toFixed(2));
  }

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        {...props}
        inputMode="numeric"
        value={display}
        onChange={handleChange}
        placeholder="0,00"
        className={cn("pl-9", className)}
      />
    </div>
  );
}
