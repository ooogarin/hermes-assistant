import { AppError } from '../../../core/errors/app-error';
import * as financeCategoryRepository from './finance-category.repository';
import type { TransactionType } from '../finance.types';
import type { Category, CategoryRow, ListCategoriesRequest, ResolvedCategory } from './finance-category.types';

export const listCategories = async (input: ListCategoriesRequest): Promise<Category[]> => {
  const rows = await financeCategoryRepository.getAllActiveByType(input.type);

  return rows.map(toCategory);
};

export const getRequiredCategoryMapByCodes = async (
  codes: string[],
  type: TransactionType,
): Promise<Map<string, ResolvedCategory>> => {
  const categories = await financeCategoryRepository.getAllActiveByCodesAndType([...new Set(codes)], type);

  const categoryByCode = new Map(
    categories.map((category) => [category.code, { ...toCategory(category), id: category.id }]),
  );
  const missingCodes = [...new Set(codes)].filter((code) => !categoryByCode.has(code));

  if (missingCodes.length > 0) {
    throw invalidCategory(missingCodes);
  }

  return categoryByCode;
};

export const getRequiredCategory = async (code: string, type: TransactionType): Promise<ResolvedCategory> => {
  const [category] = await financeCategoryRepository.getAllActiveByCodesAndType([code], type);

  if (category === undefined) {
    throw invalidCategory([code]);
  }

  return { ...toCategory(category), id: category.id };
};

const toCategory = (row: CategoryRow): Category => ({
  code: row.code,
  name: row.name,
  description: row.description,
  type: row.type,
});

const invalidCategory = (codes: string[]): AppError => {
  return new AppError({
    code: 'INVALID_TRANSACTION_CATEGORY',
    statusCode: 400,
    message: 'Transaction category is invalid for its type',
    details: { codes },
    exposeDetails: true,
  });
};
