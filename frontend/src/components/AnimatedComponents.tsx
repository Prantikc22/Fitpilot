import React, { useEffect } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  SlideInRight,
  SlideInLeft,
  ZoomIn,
  Layout,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";

// Spring configs for different feels
export const springConfigs = {
  gentle: { damping: 15, stiffness: 100 },
  snappy: { damping: 12, stiffness: 180 },
  bouncy: { damping: 8, stiffness: 150 },
  smooth: { damping: 20, stiffness: 90 },
};

// Preset entering animations
export const enteringAnimations = {
  fadeInUp: FadeInDown.springify().damping(15).stiffness(100),
  fadeInDown: FadeInUp.springify().damping(15).stiffness(100),
  slideInRight: SlideInRight.springify().damping(18).stiffness(120),
  slideInLeft: SlideInLeft.springify().damping(18).stiffness(120),
  zoomIn: ZoomIn.springify().damping(12).stiffness(150),
  fadeIn: FadeIn.duration(300),
};

// Stagger delay helper
export const staggerDelay = (index: number, baseDelay = 50) => baseDelay * index;

// Animated Card with scale and fade entrance
export function AnimatedCard({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify().damping(15).stiffness(100)}
      layout={Layout.springify()}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

// Animated List Item with stagger effect
export function AnimatedListItem({
  children,
  index,
  style,
}: {
  children: React.ReactNode;
  index: number;
  style?: ViewStyle;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 60)
        .springify()
        .damping(14)
        .stiffness(100)}
      exiting={FadeOut.duration(200)}
      layout={Layout.springify()}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

// Pulse animation for loading/attention
export function PulseView({
  children,
  style,
  active = true,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  active?: boolean;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
    } else {
      scale.value = withSpring(1);
    }
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

// Shimmer/skeleton loading effect
export function ShimmerView({
  style,
  width = 100,
  height = 20,
}: {
  style?: ViewStyle;
  width?: number | string;
  height?: number;
}) {
  const translateX = useSharedValue(-100);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(100, { duration: 1200, easing: Easing.ease }),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: "#E8E8E8",
          borderRadius: 8,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            width: "60%",
            height: "100%",
            backgroundColor: "rgba(255,255,255,0.5)",
          },
          animatedStyle,
        ]}
      />
    </Animated.View>
  );
}

// Press scale animation wrapper
export function ScalePressable({
  children,
  onPress,
  style,
  disabled,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, springConfigs.snappy);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, springConfigs.snappy);
  };

  return (
    <Animated.View style={[style, animatedStyle]}>
      <Animated.View
        onTouchStart={disabled ? undefined : handlePressIn}
        onTouchEnd={disabled ? undefined : handlePressOut}
        onTouchCancel={disabled ? undefined : handlePressOut}
      >
        {children}
      </Animated.View>
    </Animated.View>
  );
}

// Counter animation for numbers
export function AnimatedNumber({
  value,
  style,
  duration = 800,
}: {
  value: number;
  style?: any;
  duration?: number;
}) {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value]);

  const animatedProps = useAnimatedStyle(() => {
    return {
      // Note: actual number display would need Animated.Text or custom solution
    };
  });

  // For now, just animate opacity/scale when value changes
  return (
    <Animated.Text
      entering={ZoomIn.springify().damping(12)}
      style={style}
    >
      {value}
    </Animated.Text>
  );
}

// Progress bar with animation
export function AnimatedProgressBar({
  progress,
  height = 8,
  color = "#3A7D44",
  backgroundColor = "#E8E8E8",
  style,
}: {
  progress: number; // 0-1
  height?: number;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withSpring(Math.min(Math.max(progress, 0), 1) * 100, springConfigs.smooth);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
  }));

  return (
    <Animated.View
      style={[
        {
          height,
          backgroundColor,
          borderRadius: height / 2,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            height: "100%",
            backgroundColor: color,
            borderRadius: height / 2,
          },
          animatedStyle,
        ]}
      />
    </Animated.View>
  );
}

// Floating action button with bounce entrance
export function AnimatedFAB({
  children,
  style,
  delay = 0,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
}) {
  return (
    <Animated.View
      entering={ZoomIn.delay(delay).springify().damping(10).stiffness(150)}
      style={style}
    >
      {children}
    </Animated.View>
  );
}

// Shake animation for errors/attention
export function useShakeAnimation() {
  const translateX = useSharedValue(0);

  const shake = () => {
    translateX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 100 }),
      withTiming(-10, { duration: 100 }),
      withTiming(10, { duration: 100 }),
      withTiming(0, { duration: 50 })
    );
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return { shake, animatedStyle };
}

// Celebration/confetti-like bounce
export function CelebrationBounce({
  children,
  trigger,
  style,
}: {
  children: React.ReactNode;
  trigger: boolean;
  style?: ViewStyle;
}) {
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  useEffect(() => {
    if (trigger) {
      scale.value = withSequence(
        withSpring(1.2, springConfigs.bouncy),
        withSpring(1, springConfigs.gentle)
      );
      rotate.value = withSequence(
        withTiming(-5, { duration: 100 }),
        withTiming(5, { duration: 100 }),
        withTiming(-3, { duration: 100 }),
        withTiming(3, { duration: 100 }),
        withTiming(0, { duration: 100 })
      );
    }
  }, [trigger]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  return (
    <Animated.View style={[style, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

export default {
  AnimatedCard,
  AnimatedListItem,
  PulseView,
  ShimmerView,
  ScalePressable,
  AnimatedNumber,
  AnimatedProgressBar,
  AnimatedFAB,
  useShakeAnimation,
  CelebrationBounce,
  springConfigs,
  enteringAnimations,
  staggerDelay,
};
