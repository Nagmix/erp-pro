"use client"

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  value: string[]
  onChange: (next: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

/** اختيار متعدد مع بحث (fixsystem phase 3.6). */
export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "اختر عناصر...",
  disabled,
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const selected = options.filter((o) => value.includes(o.value))

  const toggle = (val: string) => {
    if (value.includes(val)) onChange(value.filter((x) => x !== val))
    else onChange([...value, val])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between rounded-[var(--radius-md-ui)] border-border/40 bg-[color:var(--surface)] px-3 font-normal hover:border-border/60 hover:bg-accent/25",
            className
          )}
        >
          <span className="truncate text-start text-sm text-muted-foreground">
            {selected.length > 0 ? `${selected.length} عنصر محدد` : placeholder}
          </span>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start" dir="rtl">
        <Command>
          <CommandInput placeholder="ابحث..." />
          <CommandList>
            <CommandEmpty>لا توجد نتائج</CommandEmpty>
            <CommandGroup>
              {options.map((o) => {
                const checked = value.includes(o.value)
                return (
                  <CommandItem key={o.value} value={o.label} onSelect={() => toggle(o.value)}>
                    <Check className={cn("ms-2 h-4 w-4 text-primary", checked ? "opacity-100" : "opacity-0")} />
                    <span>{o.label}</span>
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-1 border-t border-border/40 p-2">
            {selected.map((o) => (
              <Badge key={o.value} variant="outline" className="gap-1 border-border/40">
                {o.label}
                <button type="button" className="inline-flex items-center" onClick={() => toggle(o.value)} aria-label={`إزالة ${o.label}`}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

