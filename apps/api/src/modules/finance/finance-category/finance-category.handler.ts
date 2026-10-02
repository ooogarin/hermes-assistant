import { getQuery } from '../../../core/http/request';
import { successResponse } from '../../../core/http/response';
import * as financeCategoryService from './finance-category.service';
import { listCategoriesSchema } from './finance-category.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../../core/http/app-env';

export const listCategories = async (context: Context<AppEnv>) => {
  const query = getQuery(context, listCategoriesSchema);

  const result = await financeCategoryService.listCategories(query);

  return successResponse({ context, data: { items: result } });
};
