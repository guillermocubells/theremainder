import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";

interface ResponsiveTooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  contentClassName?: string;
}

/**
 * Shows a Tooltip (hover) on desktop and a Popover (tap) on mobile.
 */
export function ResponsiveTooltip({
  children,
  content,
  side = "bottom",
  align = "start",
  contentClassName = "text-left max-w-xs",
}: ResponsiveTooltipProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>{children}</PopoverTrigger>
        <PopoverContent
          side={side}
          align={align}
          className={contentClassName}
        >
          {content}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} className={contentClassName}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
}
