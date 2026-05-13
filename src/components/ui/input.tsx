"use client"

import * as React from "react"
import { DatePicker } from "@/components/ui/date-picker"
import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onChange, value, defaultValue, ...props }, ref) => {
    if (type === "date") {
      const current = typeof value === "string" ? value : typeof defaultValue === "string" ? defaultValue : ""
      return (
        <div className="relative">
          <DatePicker
            value={current}
            onChange={(next) => {
              if (!onChange) return
              const syntheticEvent = {
                target: { value: next },
                currentTarget: { value: next },
              } as React.ChangeEvent<HTMLInputElement>
              onChange(syntheticEvent)
            }}
            className={className}
            disabled={props.disabled}
          />
          <input
            ref={ref}
            type="hidden"
            name={props.name}
            id={props.id}
            value={current}
            required={props.required}
            readOnly
          />
        </div>
      )
    }

    return (
      <input
        ref={ref}
        type={type}
        data-slot="input"
        dir={props.dir ?? "rtl"}
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground/80 selection:bg-primary selection:text-primary-foreground border-border/40 flex h-9 w-full min-w-0 rounded-lg border bg-background px-3 py-1.5 text-sm transition-all duration-150 outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "hover:border-border/70 focus:border-primary/50 focus:ring-2 focus:ring-primary/20",
          className
        )}
        onChange={onChange}
        value={value}
        defaultValue={defaultValue}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
