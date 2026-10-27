/**
 * Tokens do design system partilhados com `globals.css` e com o HTML autónomo do proxy.
 * Em deploy standalone não lemos `src/app/globals.css` em runtime.
 */
export const DESIGN_TOKENS = {
  background: "#ffffff",
  foreground: "#18181b",
  "muted-foreground": "#52525b",
  border: "#e4e4e7",
  primary: "#6e56cf",
  ring: "#6e56cf",
} as const;

export type DesignToken = keyof typeof DESIGN_TOKENS;
