import React from "react";
import { StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";
import { colors, fonts } from "@/src/lib/theme";

const styles = StyleSheet.create({
  body: { fontFamily: fonts.body, color: colors.text, fontSize: 15, lineHeight: 22 },
  strong: { fontFamily: fonts.bodySemi, color: colors.text },
  em: { fontFamily: fonts.bodyMed, color: colors.text },
  heading1: { fontFamily: fonts.headingExt, color: colors.text, fontSize: 18, marginTop: 4, marginBottom: 4 },
  heading2: { fontFamily: fonts.headingExt, color: colors.text, fontSize: 16, marginTop: 4 },
  heading3: { fontFamily: fonts.heading, color: colors.text, fontSize: 15, marginTop: 4 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  list_item: { marginVertical: 2 },
  paragraph: { marginVertical: 4 },
  blockquote: { backgroundColor: colors.brandLight, padding: 10, borderLeftColor: colors.brand, borderLeftWidth: 3, borderRadius: 6 },
  code_inline: { backgroundColor: colors.bgWarm, paddingHorizontal: 4, borderRadius: 4, fontFamily: fonts.body },
  hr: { backgroundColor: colors.border, height: 1, marginVertical: 8 },
});

export function MarkdownText({ children, dark = false }: { children: string; dark?: boolean }) {
  const overrideDark = dark
    ? {
        body: { ...styles.body, color: "#fff" },
        strong: { ...styles.strong, color: "#fff" },
        em: { ...styles.em, color: "#fff" },
        heading1: { ...styles.heading1, color: "#fff" },
        heading2: { ...styles.heading2, color: "#fff" },
        heading3: { ...styles.heading3, color: "#fff" },
        bullet_list_icon: { color: "#fff" },
      }
    : {};
  return <Markdown style={{ ...styles, ...overrideDark } as any}>{children}</Markdown>;
}
