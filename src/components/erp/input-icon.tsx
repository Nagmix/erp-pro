"use client";

import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface InputIconProps extends Omit<ComponentProps<typeof Input>, "size"> {
  startIcon?: ReactNode;
  endIcon?: ReactNode;
  onEndIconClick?: () => void;
}

/** Input with start/end icon support (fixsystem phase 2.2). */
export function InputIcon({
  startIcon,
  endIcon,
  onEndIconClick,
  className,
  ...props
}: InputIconProps) {
  return (
    <div className="relative">
      {startIcon ? (
        <span className="pointer-events-none absolute inset-y-0 start-3 flex items-center text-muted-foreground">
          {startIcon}
        </span>
      ) : null}
      <Input
        className={cn(startIcon && "ps-9", endIcon && "pe-9", className)}
        {...props}
      />
      {endIcon ? (
        <button
          type="button"
          onClick={onEndIconClick}
          className={cn(
            "absolute inset-y-0 end-2 flex items-center px-1 text-muted-foreground",
            onEndIconClick ? "cursor-pointer hover:text-foreground" : "pointer-events-none"
          )}
          tabIndex={onEndIconClick ? 0 : -1}
          aria-label="input-action"
        >
          {endIcon}
        </button>
      ) : null}
    </div>
  );
}
