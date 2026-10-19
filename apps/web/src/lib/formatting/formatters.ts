const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
  style: 'percent',
});

const dateFormatter = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const monthFormatter = new Intl.DateTimeFormat('id-ID', {
  month: 'long',
  year: 'numeric',
});

const toDate = (value: Date | string): Date => {
  if (value instanceof Date) {
    return value;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
};

export const formatCurrency = (value: number): string => currencyFormatter.format(value);
export const formatPercentage = (ratio: number): string => percentageFormatter.format(ratio);
export const formatDate = (value: Date | string): string => dateFormatter.format(toDate(value));
export const formatMonth = (value: Date | string): string => monthFormatter.format(toDate(value));
export const formatDisplayLabel = (value: string): string =>
  value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toLocaleUpperCase() + word.slice(1))
    .join(' ');
