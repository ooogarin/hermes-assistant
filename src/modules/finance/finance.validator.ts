import { z } from 'zod';

const dateSchema = z.iso.date();
const nullableTextSchema = z.string().trim().min(1).max(2_000).nullable();
const transactionTypeSchema = z.enum(['expense', 'income']);

const transactionInputSchema = z.object({
  amount: z.number().int().positive().max(2_147_483_647),
  categoryCode: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(300),
  location: nullableTextSchema.optional().default(null),
  note: nullableTextSchema.optional().default(null),
});

export const createTransactionsSchema = z.object({
  date: dateSchema,
  type: transactionTypeSchema.default('expense'),
  rawText: z.string().min(1).max(20_000),
  transactions: z.array(transactionInputSchema).min(1).max(100),
});

export const updateTransactionSchema = z
  .object({
    amount: z.number().int().positive().max(2_147_483_647).optional(),
    categoryCode: z.string().trim().min(1).max(100).optional(),
    name: z.string().trim().min(1).max(300).optional(),
    location: nullableTextSchema.optional(),
    note: nullableTextSchema.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, 'At least one field must be provided.');

export const transactionReferenceSchema = z.object({
  date: dateSchema,
  dailyNumber: z.coerce.number().int().positive(),
});

export const listTransactionsSchema = z.object({
  date: dateSchema,
});

export const listCategoriesSchema = z.object({
  type: transactionTypeSchema.optional(),
});

export const summaryQuerySchema = z
  .object({
    from: dateSchema,
    to: dateSchema,
    mode: z.enum(['expense', 'income', 'net']).default('expense'),
  })
  .refine((value) => value.from <= value.to, 'The from date must be on or before the to date.');
