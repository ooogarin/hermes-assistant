import { Hono } from 'hono';
import { appValidator } from '../../core/http/validator';
import * as readingHandler from './reading.handler';
import {
  createMaterialSchema,
  listMaterialsSchema,
  materialCodeSchema,
  saveSubmissionSchema,
  updateSettingsSchema,
} from './reading.validator';
import type { AppEnv } from '../../core/http/app-env';

export const createReadingRoutes = () => {
  const route = new Hono<AppEnv>();

  route.get('/settings', readingHandler.getSettings);
  route.patch('/settings', appValidator('json', updateSettingsSchema), readingHandler.updateSettings);
  route.post('/materials', appValidator('json', createMaterialSchema), readingHandler.createMaterial);
  route.get('/materials', appValidator('query', listMaterialsSchema), readingHandler.listMaterials);
  route.get('/materials/:code', appValidator('param', materialCodeSchema), readingHandler.getMaterial);
  route.post(
    '/materials/:code/submissions',
    appValidator('param', materialCodeSchema),
    appValidator('json', saveSubmissionSchema),
    readingHandler.saveSubmission,
  );
  route.get(
    '/materials/:code/expected-answers',
    appValidator('param', materialCodeSchema),
    readingHandler.getExpectedAnswers,
  );

  return route;
};
