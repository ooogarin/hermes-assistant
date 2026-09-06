const datePattern = /^\d{4}-\d{2}-\d{2}$/;

const pad = (value: number): string => String(value).padStart(2, '0');

export const getDateValue = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export const isDateValue = (value: string): boolean => {
  if (!datePattern.test(value)) return false;
  return getDateValue(new Date(`${value}T00:00:00`)) === value;
};

export const getSafeDate = (value: string | null, today: Date): string => {
  const max = getDateValue(today);
  return value !== null && isDateValue(value) && value <= max ? value : max;
};

export const shiftDate = (value: string, days: number): string => {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return getDateValue(date);
};

export type FinanceRange = { from: string; to: string };

export const getDefaultRange = (today: Date): FinanceRange => ({
  from: `${today.getFullYear()}-${pad(today.getMonth() + 1)}-01`,
  to: getDateValue(today),
});

export const getSafeRange = (from: string | null, to: string | null, today: Date): FinanceRange => {
  const fallback = getDefaultRange(today);

  if (from === null || to === null || !isDateValue(from) || !isDateValue(to) || from > to) return fallback;

  const max = getDateValue(today);
  return from <= max && to <= max ? { from, to } : fallback;
};
