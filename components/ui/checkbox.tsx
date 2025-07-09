import * as React from "react";
import { Pressable, View, StyleSheet } from "react-native";
import { Check } from "lucide-react-native";
import { cn } from "../../lib/utils";

export interface CheckboxProps {
  id?: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
}

const Checkbox = React.forwardRef<any, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, ...props }, ref) => {
    const handlePress = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked);
      }
    };

    return (
      <Pressable
        ref={ref}
        onPress={handlePress}
        disabled={disabled}
        style={[
          styles.checkbox,
          checked && styles.checked,
          disabled && styles.disabled
        ]}
        {...props}
      >
        {checked && (
          <Check size={20} color="white" />
        )}
      </Pressable>
    );
  },
);

Checkbox.displayName = "Checkbox";

const styles = StyleSheet.create({
  checkbox: {
    width: 33,
    height: 33,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: {
    backgroundColor: 'white',
  },
  disabled: {
    opacity: 0.5,
  },
});

export { Checkbox };