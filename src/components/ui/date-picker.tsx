"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { arSA, enUS } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

type CalendarSystem = "gregorian" | "hijri"

interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  calendarSystem?: CalendarSystem
}

function toDate(value?: string): Date | undefined {
  if (!value) return undefined
  const date = parseISO(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

function formatDateLabel(date: Date, system: CalendarSystem): string {
  if (system === "hijri") {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date)
  }
  return format(date, "PPP", { locale: arSA })
}

/** DatePicker يدعم عرض ميلادي/هجري مع إخراج قيمة ISO (yyyy-MM-dd). */
export function DatePicker({
  value,
  onChange,
  placeholder = "اختر التاريخ",
  disabled,
  className,
  calendarSystem = "gregorian",
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = React.useMemo(() => toDate(value), [value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-between rounded-[var(--radius-md-ui)] border-border/40 bg-[color:var(--surface)] px-3 text-sm font-normal hover:border-border/60 hover:bg-accent/30",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate text-start">
            {selected ? formatDateLabel(selected, calendarSystem) : placeholder}
          </span>
          <CalendarIcon className="ms-2 h-4 w-4 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" dir="rtl">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(next) => {
            if (!next) return
            onChange?.(toIsoDate(next))
            setOpen(false)
          }}
          locale={calendarSystem === "hijri" ? enUS : arSA}
          dir="rtl"
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

