import { getDatabaseClient } from '../../../core/database/client';
import type { TransactionType } from '../finance.types';
import type { CategoryRow } from './finance-category.types';

export const getAllActiveByType = async (type?: TransactionType): Promise<CategoryRow[]> => {
  const database = getDatabaseClient();

  const rows = await database<CategoryRow[]>`
    SELECT
      id,
      code,
      name,
      description,
      type
    FROM categories
    WHERE is_active = TRUE
      AND (${type ?? null}::transaction_type IS NULL OR type = ${type ?? null}::transaction_type)
    ORDER BY
      name ASC,
      code ASC
  `;

  return rows;
};

export const getAllActiveByCodesAndType = async (codes: string[], type: TransactionType): Promise<CategoryRow[]> => {
  const database = getDatabaseClient();

  return database<CategoryRow[]>`
    SELECT
      id,
      code,
      name,
      description,
      type
    FROM categories
    WHERE is_active = TRUE
      AND type = ${type}::transaction_type
      AND code = ANY(${database.array(codes, 'TEXT')})
  `;
};
