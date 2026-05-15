import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative min-w-0 w-full rounded-md border px-3 py-2 text-sm leading-6 [&>svg]:absolute [&>svg]:left-3 [&>svg]:top-2.5 [&>svg]:h-4 [&>svg]:w-4 [&>svg+*]:pl-6",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-card-foreground",
        info: "border-primary/30 bg-primary/5 text-foreground [&>svg]:text-primary",
        warning:
          "border-accent/40 bg-accent/10 text-foreground [&>svg]:text-accent-foreground",
        destructive:
          "border-destructive/40 bg-destructive/10 text-foreground [&>svg]:text-destructive",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export type AlertProps = React.HTMLAttributes<HTMLDivElement> &
  VariantProps<typeof alertVariants>;

export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, ...props }, ref) => (
    <div
      ref={ref}
      role="alert"
      className={cn(alertVariants({ variant, className }))}
      {...props}
    />
  ),
);
Alert.displayName = "Alert";

export const AlertTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h4
    ref={ref}
    className={cn("mb-1 font-medium leading-none", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

export const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm leading-6 text-muted-foreground", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";
