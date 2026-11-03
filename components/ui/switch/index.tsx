"use client";
import React from "react";
import { Switch as RNSwitch } from "react-native";
import { createSwitch } from "@gluestack-ui/core/switch/creator";
import { withStyleContext } from "@gluestack-ui/utils/nativewind-utils";

const UISwitch = createSwitch({
  Root: withStyleContext(RNSwitch),
});

// Uniwind types Switch's className as `never`, so size goes through style.
const SWITCH_SCALE = { sm: 0.75, md: 1, lg: 1.25 } as const;

type ISwitchProps = React.ComponentProps<typeof UISwitch> & {
  size?: keyof typeof SWITCH_SCALE;
};
const Switch = React.forwardRef<
  React.ComponentRef<typeof UISwitch>,
  ISwitchProps
>(function Switch({ size = "md", style, ...props }, ref) {
  return (
    <UISwitch
      ref={ref}
      {...props}
      style={[{ transform: [{ scale: SWITCH_SCALE[size] }] }, style]}
    />
  );
});

Switch.displayName = "Switch";
export { Switch };
