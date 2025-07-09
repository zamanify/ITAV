import * as React from "react";
import { View, StyleSheet } from "react-native";
import { cn } from "../../lib/utils";

export interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
  style?: any;
}

const Separator = React.forwardRef<any, SeparatorProps>(
  ({ className, orientation = "horizontal", style, ...props }, ref) => {
    return (
      <View
        ref={ref}
        style={[
          styles.separator,
          orientation === "horizontal" ? styles.horizontal : styles.vertical,
          style
        ]}
        {...props}
      />
    );
  },
);

Separator.displayName = "Separator";

const styles = StyleSheet.create({
  separator: {
    backgroundColor: 'white',
  },
  horizontal: {
    height: 1,
    width: '100%',
  },
  vertical: {
    width: 2,
    height: 47,
  },
});

export { Separator };