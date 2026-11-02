import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-blue-100 text-blue-800 border border-blue-200",
        secondary: "bg-slate-100 text-slate-800 border border-slate-200",
        destructive: "bg-red-100 text-red-800 border border-red-200",
        success: "bg-emerald-100 text-emerald-800 border border-emerald-200",
        warning: "bg-amber-100 text-amber-800 border border-amber-200",
        outline: "text-slate-900 border border-slate-300",
        admin: "bg-purple-100 text-purple-800 border border-purple-200",
        officer: "bg-indigo-100 text-indigo-800 border border-indigo-200",
        instructor: "bg-blue-100 text-blue-800 border border-blue-200",
        student: "bg-teal-100 text-teal-800 border border-teal-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
