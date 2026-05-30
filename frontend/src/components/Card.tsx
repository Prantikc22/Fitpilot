import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "@/src/contexts/ThemeContext";
import { radius, shadow } from "@/src/lib/theme";

export function Card({
  children,
  style,
  variant = "default",
  testID,
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: "default" | "highlight" | "dark";
  testID?: string;
}) {
  const { colors } = useTheme();
  
  const variantStyle =
    variant === "highlight"
      ? { backgroundColor: colors.brandLight, borderColor: "transparent" }
      : variant === "dark"
      ? { backgroundColor: colors.brand, borderColor: "transparent" }
      : { backgroundColor: colors.bgAlt, borderColor: colors.border };
  
  return (
    <View testID={testID} style={[styles.card, variantStyle, shadow.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: 20,
    borderWidth: 1,
  },
});
