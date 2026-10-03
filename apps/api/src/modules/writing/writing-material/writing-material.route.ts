import { Hono } from 'hono';
import { appValidator } from '../../../core/http/validator';
import * as writingMaterialHandler from './writing-material.handler';
import { createMaterialSchema, listMaterialsSchema, materialCodeSchema } from './writing-material.validator';
import type { AppEnv } from '../../../core/http/app-env';

export const createWritingMaterialRoutes = () => {
  const route = new Hono<AppEnv>();

  route.post('/', appValidator('json', createMaterialSchema), writingMaterialHandler.createMaterial);
  route.get('/', appValidator('query', listMaterialsSchema), writingMaterialHandler.listMaterials);
  route.get('/:code', appValidator('param', materialCodeSchema), writingMaterialHandler.getMaterial);

  return route;
};
