"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"

import { cn } from "@/lib/utils"

/**
 * Wrap a surface that has several tooltips. Once one is open, hovering a
 * neighbour opens it instantly — the delay exists to stop accidental
 * activation, and that job is already done once the first one is showing.
 */
function TooltipProvider({
  delay = 500,
  closeDelay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      delay={delay}
      closeDelay={closeDelay}
      {...props}
    />
  )
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

function TooltipTrigger({ ...props }: TooltipPrimitive.Trigger.Props) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />
}

function TooltipContent({
  className,
  side = "right",
  sideOffset = 8,
  align = "center",
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "side" | "sideOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(
            // Scales from the trigger, not from the centre: origin-aware popovers
            // are the difference between the tooltip belonging to the thing it
            // describes and arriving from nowhere. Never from scale(0).
            "z-50 max-w-64 origin-(--transform-origin) text-balance rounded-md bg-popover px-2 py-1 text-xs font-medium text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden",
            "transition-[opacity,scale] duration-125 ease-out-strong",
            "data-[starting-style]:scale-97 data-[starting-style]:opacity-0",
            "data-[ending-style]:scale-97 data-[ending-style]:opacity-0",
            // A tooltip opened while another was already showing skips the
            // animation entirely — the surface should feel instant by then.
            "data-instant:duration-0",
            className
          )}
          {...props}
        />
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger }
