import { Icon, type IconifyIcon } from "@iconify/react"
import type { IconProps as PhosphorIconProps } from "@phosphor-icons/react"
import { Sparkle } from "@phosphor-icons/react"
import type { ComponentType } from "react"
import { cn } from "@/lib/utils"

type PhosphorComponent = ComponentType<PhosphorIconProps>

type ModernIconProps = {
  className?: string
  iconify?: string | IconifyIcon
  phosphor?: PhosphorComponent
  weight?: PhosphorIconProps["weight"]
  iconifyInline?: boolean
}

export function ModernIcon({
  className,
  iconify,
  phosphor: PhosphorIcon = Sparkle,
  weight = "duotone",
  iconifyInline = true,
}: ModernIconProps) {
  if (iconify) {
    return (
      <Icon
        icon={iconify}
        className={cn("shrink-0", className)}
        inline={iconifyInline}
      />
    )
  }

  return <PhosphorIcon className={cn("shrink-0", className)} weight={weight} />
}
