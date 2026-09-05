export type JakartaDateCodeParts = {
  key: number;
  segment: string;
};

const jakartaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const getJakartaDateCodeParts = (value: Date): JakartaDateCodeParts => {
  const parts = jakartaDateFormatter.formatToParts(value);
  const getPart = (type: Intl.DateTimeFormatPartTypes): string => {
    return parts.find((part) => part.type === type)?.value ?? '';
  };
  const segment = `${getPart('year')}${getPart('month')}${getPart('day')}`;

  return { key: Number(segment), segment };
};

export const toIsoTimestamp = (value: Date | string): string => {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
};
