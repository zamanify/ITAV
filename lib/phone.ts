export function normalizePhoneNumber(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('0')) {
    return '+46' + cleaned.substring(1);
  }

  if (cleaned.startsWith('46')) {
    return '+' + cleaned;
  }

  if (!cleaned.startsWith('+')) {
    return '+46' + cleaned;
  }

  return cleaned;
}
