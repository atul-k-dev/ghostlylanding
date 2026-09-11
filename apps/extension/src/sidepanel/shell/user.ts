/** "Atul Kumar" → "AK"; falls back to the email's first letter. */
export const initials = (name: string, email = ''): string => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0]![0]}${parts[parts.length - 1]![0]}` : (parts[0]?.[0] ?? email[0] ?? '?');
  return letters.toUpperCase();
};

export const firstName = (name: string, email = ''): string =>
  name.trim().split(/\s+/)[0] || email.split('@')[0] || 'there';

export const greeting = (now = new Date()): string => {
  const h = now.getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};
