// src/lib/utils.ts
// Simple classNames utility used throughout the app.
export function cn(...inputs: (string | undefined | false | null)[]) {
  return inputs.filter(Boolean).join(' ');
}
