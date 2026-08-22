import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 [&>svg]:pointer-events-none",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80",
        outline:
          "border-border bg-card text-foreground [a&]:hover:bg-muted",
        success:
          "border-[var(--success)]/25 bg-[var(--success)]/10 text-[var(--success)] [a&]:hover:bg-[var(--success)]/15",
        warning:
          "border-[var(--warning)]/30 bg-[var(--warning)]/10 text-[var(--warning)] [a&]:hover:bg-[var(--warning)]/15",
        destructive:
          "border-[var(--destructive)]/25 bg-[var(--destructive)]/10 text-[var(--destructive)] [a&]:hover:bg-[var(--destructive)]/15",
        accent:
          "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)] [a&]:hover:bg-[var(--accent)]/15",
        blue:
          "border-[var(--blue)]/30 bg-[var(--blue)]/10 text-[var(--blue)] [a&]:hover:bg-[var(--blue)]/15",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };