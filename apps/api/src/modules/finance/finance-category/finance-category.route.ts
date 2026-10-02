import { Hono } from 'hono';
import { appValidator } from '../../../core/http/validator';
import * as financeCategoryHandler from './finance-category.handler';
import { listCategoriesSchema } from './finance-category.validator';
import type { AppEnv } from '../../../core/http/app-env';

export const createFinanceCategoryRoutes = () => {
  const route = new Hono<AppEnv>();

  route.get('/', appValidator('query', listCategoriesSchema), financeCategoryHandler.listCategories);

  return route;
};
