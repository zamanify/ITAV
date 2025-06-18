export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/[^+\d]/g, '');

  if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  } else if (cleaned.startsWith('00')) {
    cleaned = cleaned.slice(2);
  } else if (cleaned.startsWith('0')) {
    cleaned = '46' + cleaned.slice(1);
  }

  if (!cleaned.startsWith('46')) {
    cleaned = '46' + cleaned;
  }

  return '+' + cleaned;
}
