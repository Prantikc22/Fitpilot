import React from "react";
import { StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";
import { useTheme } from "@/src/contexts/ThemeContext";
import { fonts } from "@/src/lib/theme";

export function MarkdownText({ children, dark = false }: { children: string; dark?: boolean }) {
  const { colors } = useTheme();
  
  const baseStyles = StyleSheet.create({
    body: { fontFamily: fonts.body, color: dark ? "#fff" : colors.text, fontSize: 15, lineHeight: 22 },
    strong: { fontFamily: fonts.bodySemi, color: dark ? "#fff" : colors.text },
    em: { fontFamily: fonts.bodyMed, color: dark ? "#fff" : colors.text },
    heading1: { fontFamily: fonts.headingExt, color: dark ? "#fff" : colors.text, fontSize: 18, marginTop: 4, marginBottom: 4 },
    heading2: { fontFamily: fonts.headingExt, color: dark ? "#fff" : colors.text, fontSize: 16, marginTop: 4 },
    heading3: { fontFamily: fonts.heading, color: dark ? "#fff" : colors.text, fontSize: 15, marginTop: 4 },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    list_item: { marginVertical: 2 },
    paragraph: { marginVertical: 4 },
    blockquote: { backgroundColor: colors.brandLight, padding: 10, borderLeftColor: colors.brand, borderLeftWidth: 3, borderRadius: 6 },
    code_inline: { backgroundColor: colors.bgWarm, paddingHorizontal: 4, borderRadius: 4, fontFamily: fonts.body },
    hr: { backgroundColor: colors.border, height: 1, marginVertical: 8 },
  });

  return <Markdown style={baseStyles as any}>{children}</Markdown>;
}
