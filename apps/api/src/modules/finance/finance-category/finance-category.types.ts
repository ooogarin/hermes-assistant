import type { z } from 'zod';
import type { TransactionType } from '../finance.types';
import type { listCategoriesSchema } from './finance-category.validator';

// Request contracts

export type ListCategoriesRequest = z.infer<typeof listCategoriesSchema>;

// Service operations

export type Category = {
  code: string;
  name: string;
  description: string;
  type: TransactionType;
};

export type ResolvedCategory = Category & { id: number };

export type FinanceCategoryService = {
  listCategories: (input: ListCategoriesRequest) => Promise<Category[]>;
};

// Repository responses

export type CategoryRow = {
  id: number;
  code: string;
  name: string;
  description: string;
  type: TransactionType;
};
