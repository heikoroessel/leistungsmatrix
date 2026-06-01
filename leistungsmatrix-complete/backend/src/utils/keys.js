// Einfacher nanoid-Ersatz ohne externe Abhängigkeit
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function nanoid(length = 6) {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
