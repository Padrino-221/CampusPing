const GSM7_CHARS = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyz äöñüà"
);
const GSM7_EXTENSION_CHARS = new Set("^{}\\[~]|€");

function detectUnicode(message) {
  if (!message) return false;
  return ![...message].every((c) => GSM7_CHARS.has(c) || GSM7_EXTENSION_CHARS.has(c));
}

function getGsm7Length(message) {
  return [...message].reduce((len, c) => len + (GSM7_EXTENSION_CHARS.has(c) ? 2 : 1), 0);
}

export function calculateSmsUnits(message) {
  if (!message) return { units: 0, remaining: 0, isUnicode: false };
  const isUnicode = detectUnicode(message);
  const length = isUnicode ? message.length : getGsm7Length(message);

  if (isUnicode) {
    if (length <= 70) return { units: 1, remaining: 70 - length, isUnicode: true };
    const parts = Math.ceil(length / 67);
    return { units: parts, remaining: parts * 67 - length, isUnicode: true };
  }
  if (length <= 160) return { units: 1, remaining: 160 - length, isUnicode: false };
  const parts = Math.ceil(length / 153);
  return { units: parts, remaining: parts * 153 - length, isUnicode: false };
}

export function useSmsCalculator(message) {
  return calculateSmsUnits(message);
}
