import { Slot } from "@radix-ui/react-slot";
import { type VariantProps, cva } from "class-variance-authority";
import * as React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps extends VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  onPress?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

const Button = React.forwardRef<any, ButtonProps>(
  ({ className, variant, size, asChild = false, onPress, children, disabled, ...props }, ref) => {
    const buttonClass = cn(buttonVariants({ variant, size, className }));
    
    if (asChild) {
      return <Slot>{children}</Slot>;
    }

    return (
      <Pressable
        ref={ref}
        onPress={onPress}
        disabled={disabled}
        style={[
          styles.button,
          variant === 'outline' && styles.outline,
          disabled && styles.disabled
        ]}
        {...props}
      >
        {typeof children === 'string' ? (
          <Text style={[
            styles.text,
            variant === 'outline' && styles.outlineText
          ]}>
            {children}
          </Text>
        ) : (
          children
        )}
      </Pressable>
    );
  },
);

Button.displayName = "Button";

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 56,
    minHeight: 48,
  },
  outline: {
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'transparent',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  outlineText: {
    color: 'white',
  },
  disabled: {
    opacity: 0.5,
  },
});

export { Button, buttonVariants };