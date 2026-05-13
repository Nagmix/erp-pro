"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { enUS } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

function toDate(value?: string): Date | undefined {
  if (!value) return undefined
  const date = parseISO(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function toIsoDate(date: Date): string {
  return format(date, "yyyy-MM-dd")
}

function formatDateLabel(date: Date): string {
  // تنسيق ميلادي بأرقام إنجليزية وأسماء أشهر عربية
  const day = date.getDate()
  const year = date.getFullYear()
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ]
  const month = arabicMonths[date.getMonth()] || ''
  return `${day} ${month} ${year}`
}

/** DatePicker يدعم عرض ميلادي/هجري مع إخراج قيمة ISO (yyyy-MM-dd). */
export function DatePicker({
  value,
  onChange,
  placeholder = "اختر التاريخ",
  disabled,
  className,
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
            {selected ? formatDateLabel(selected) : placeholder}
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
          locale={enUS}
          dir="rtl"
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

