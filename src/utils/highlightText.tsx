import React, { useMemo } from "react";

/**
 * Highlight matched terms within text. Returns React nodes with <mark> tags.
 */
export function highlightText(
  text: string | null | undefined,
  tokens: string[]
): React.ReactNode {
  if (!text || !tokens.length) return text ?? null;

  const escaped = tokens
    .filter(t => t.length > 0)
    .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (escaped.length === 0) return text;

  const regex = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(regex);

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="bg-primary/15 text-foreground rounded-sm px-0.5 font-medium"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

/**
 * React hook wrapper for highlight - memoises the tokens array.
 */
export function useHighlight(tokens: string[]) {
  return useMemo(
    () => (text: string | null | undefined) => highlightText(text, tokens),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tokens.join(",")]
  );
}
