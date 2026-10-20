import { z } from 'zod';

export const formatPublicCode = (prefix: string, dateSegment: string, sequence: number): string => {
  return `${prefix}-${dateSegment}-${String(sequence).padStart(3, '0')}`;
};

export const writingMaterialCodeSchema = z.string().regex(/^WR-\d{8}-\d{3,}$/);
export const writingSubmissionCodeSchema = z.string().regex(/^WS-\d{8}-\d{3,}$/);
