export const formatPublicCode = (prefix: string, dateSegment: string, sequence: number): string => {
  return `${prefix}-${dateSegment}-${String(sequence).padStart(3, '0')}`;
};
