// Mirrors public.has_money_words in the database so the app can warn before
// sending. The server flags regardless; this is only a heads-up for the user.
const MONEY =
  /(\$|\bbets?\b|\bbetting\b|\bwagers?\b|\bpurses?\b|\bprizes?\b|\bcash ?app\b|\bvenmo\b|\bzelle\b|\bpaypal\b|\bcash\b|\bmoney\b|\bpay(s|ing|ment|ments)?\b|\bodds\b|\bstakes?\b|\btickets?\b)/i;

export function hasMoneyWords(text: string | null | undefined) {
  return MONEY.test(text ?? '');
}

export const USERNAME = /^[a-z0-9_]{3,20}$/;

export function isAdult(birthDate: Date, today = new Date()) {
  const eighteen = new Date(birthDate);
  eighteen.setFullYear(birthDate.getFullYear() + 18);
  return eighteen <= today;
}
