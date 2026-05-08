"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { arSA } from "date-fns/locale"
import type { DateRange } from "react-day-picker"
import { CalendarDays } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DateRangeValue {
  from?: string
  to?: string
}

interface DateRangePickerProps {
  value?: DateRangeValue
  onChange?: (value: DateRangeValue) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function toDate(input?: string): Date | undefined {
  if (!input) return undefined
  const d = parseISO(input)
  return Number.isNaN(d.getTime()) ? undefined : d
}

function toIso(input?: Date): string | undefined {
  return input ? format(input, "yyyy-MM-dd") : undefined
}

/** DateRangePicker بقيمة ISO from/to. */
export function DateRangePicker({
  value,
  onChange,
  placeholder = "اختر الفترة",
  disabled,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const range = React.useMemo<DateRange>(
    () => ({
      from: toDate(value?.from),
      to: toDate(value?.to),
    }),
    [value?.from, value?.to]
  )

  const label = React.useMemo(() => {
    if (!range.from && !range.to) return placeholder
    if (range.from && range.to) return `${format(range.from, "PPP", { locale: arSA })} - ${format(range.to, "PPP", { locale: arSA })}`
    return range.from ? `${format(range.from, "PPP", { locale: arSA })} - ...` : placeholder
  }, [range.from, range.to, placeholder])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between rounded-[var(--radius-md-ui)] border-border/40 bg-[color:var(--surface)] px-3 text-sm font-normal hover:border-border/60 hover:bg-accent/30",
            !(range.from || range.to) && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate text-start">{label}</span>
          <CalendarDays className="ms-2 h-4 w-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" dir="rtl">
        <Calendar
          mode="range"
          selected={range}
          onSelect={(next) => {
            onChange?.({ from: toIso(next?.from), to: toIso(next?.to) })
            if (next?.from && next?.to) setOpen(false)
          }}
          numberOfMonths={2}
          locale={arSA}
          dir="rtl"
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

