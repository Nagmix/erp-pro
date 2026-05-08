"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

type FieldSize = "sm" | "md" | "lg";

interface FormFieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  size?: FieldSize;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
}

const sizeMap: Record<FieldSize, { label: string; spacing: string }> = {
  sm: { label: "text-[11px]", spacing: "space-y-1" },
  md: { label: "text-xs", spacing: "space-y-2" },
  lg: { label: "text-sm", spacing: "space-y-2.5" },
};

/** Wrapper قياسي لحقول النماذج: تسمية + حقل + hint/error (fixsystem phase 2.1). */
export function FormField({
  label,
  hint,
  error,
  required = false,
  size = "md",
  className,
  contentClassName,
  children,
}: FormFieldProps) {
  const token = sizeMap[size];
  return (
    <div className={cn("min-w-0", token.spacing, className)}>
      {label ? (
        <Label
          className={cn(
            "block font-medium text-foreground",
            token.label,
            error && "text-destructive"
          )}
        >
          {label}
          {required ? <span className="ms-1 text-destructive">*</span> : null}
        </Label>
      ) : null}
      <div className={cn("min-w-0", contentClassName)}>{children}</div>
      {error ? (
        <p className="text-[11px] font-medium text-destructive">{error}</p>
      ) : hint ? (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
