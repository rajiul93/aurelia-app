import { Linking, Text } from "react-native";

import { ThemedText, type ThemedTextProps } from "@/components/themed-text";
import { splitTextWithLinks } from "@/lib/text/linkify";

type LinkifiedTextProps = ThemedTextProps & {
  content: string;
  /** Color for the tappable URL segments, distinct from the surrounding text. */
  linkColor: string;
};

/**
 * Renders message text with any `http(s)://` URL as a tappable link, opened
 * via the OS (`Linking.openURL`) rather than in-app — chat replies can quote
 * admin-authored content (FAQ/knowledge-base bodies) that includes a URL, e.g.
 * a ticket-booking page.
 */
export function LinkifiedText({
  content,
  linkColor,
  ...rest
}: LinkifiedTextProps) {
  const segments = splitTextWithLinks(content);

  return (
    <ThemedText {...rest}>
      {segments.map((segment, index) =>
        segment.type === "link" ? (
          <Text
            key={index}
            style={{ color: linkColor, textDecorationLine: "underline" }}
            onPress={() => Linking.openURL(segment.value)}
          >
            {segment.value}
          </Text>
        ) : (
          segment.value
        ),
      )}
    </ThemedText>
  );
}
