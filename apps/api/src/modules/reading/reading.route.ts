import { Hono } from 'hono';
import { appValidator } from '../../core/http/validator';
import * as readingHandler from './reading.handler';
import {
  createMaterialSchema,
  listMaterialsSchema,
  materialCodeSchema,
  saveAnswersSchema,
  updateMaterialSchema,
  updateSettingsSchema,
} from './reading.validator';
import type { AppEnv } from '../../core/http/app-env';

export const createReadingRoutes = () => {
  const route = new Hono<AppEnv>();

  route.get('/settings', readingHandler.getSettings);
  route.patch('/settings', appValidator('json', updateSettingsSchema), readingHandler.updateSettings);
  route.post('/materials', appValidator('json', createMaterialSchema), readingHandler.createMaterial);
  route.get('/materials', appValidator('query', listMaterialsSchema), readingHandler.listMaterials);
  route.patch(
    '/materials/:code',
    appValidator('param', materialCodeSchema),
    appValidator('json', updateMaterialSchema),
    readingHandler.updateMaterial,
  );
  route.get('/materials/:code', appValidator('param', materialCodeSchema), readingHandler.getMaterial);
  route.patch(
    '/materials/:code/answers',
    appValidator('param', materialCodeSchema),
    appValidator('json', saveAnswersSchema),
    readingHandler.saveAnswers,
  );
  route.get(
    '/materials/:code/expected-answers',
    appValidator('param', materialCodeSchema),
    readingHandler.getExpectedAnswers,
  );

  return route;
};
