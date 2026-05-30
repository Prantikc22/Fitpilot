import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { useTheme } from "@/src/contexts/ThemeContext";
import { fonts, radius } from "@/src/lib/theme";

type Props = {
  title: string;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "outline" | "danger";
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  testID?: string;
  size?: "md" | "lg";
};

export function Button({ title, onPress, variant = "primary", loading, disabled, style, testID, size = "lg" }: Props) {
  const { colors } = useTheme();
  
  const bg =
    variant === "primary"
      ? colors.brand
      : variant === "secondary"
      ? colors.brandLight
      : variant === "danger"
      ? colors.error
      : "transparent";
  const fg = variant === "primary" || variant === "danger" ? colors.textInv : colors.brand;
  const border = variant === "outline" ? colors.border : "transparent";
  const minH = size === "lg" ? 56 : 44;
  
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      testID={testID}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: bg, borderColor: border, minHeight: minH, opacity: pressed ? 0.85 : 1 },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Text style={[styles.text, { color: fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingVertical: 16,
    paddingHorizontal: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    flexDirection: "row",
  },
  text: { fontFamily: fonts.bodySemi, fontSize: 16, letterSpacing: 0.2 },
});
