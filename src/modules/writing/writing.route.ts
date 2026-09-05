import { Hono } from 'hono';
import { appValidator } from '../../core/http/validator';
import * as writingHandler from './writing.handler';
import {
  createMaterialSchema,
  createSubmissionSchema,
  materialCodeSchema,
  submissionParamsSchema,
  updateSettingsSchema,
} from './writing.validator';
import type { AppEnv } from '../../core/http/app-env';

export const createWritingRoutes = () => {
  const route = new Hono<AppEnv>();

  route.get('/settings', writingHandler.getSettings);
  route.patch('/settings', appValidator('json', updateSettingsSchema), writingHandler.updateSettings);
  route.post('/materials', appValidator('json', createMaterialSchema), writingHandler.createMaterial);
  route.get('/materials/:code', appValidator('param', materialCodeSchema), writingHandler.getMaterial);
  route.post(
    '/materials/:code/submissions',
    appValidator('param', materialCodeSchema),
    appValidator('json', createSubmissionSchema),
    writingHandler.createSubmission,
  );
  route.get(
    '/materials/:code/submissions/:submissionNumber',
    appValidator('param', submissionParamsSchema),
    writingHandler.getSubmission,
  );
  route.get(
    '/materials/:code/submissions/:submissionNumber/corrected-text',
    appValidator('param', submissionParamsSchema),
    writingHandler.getCorrectedText,
  );

  return route;
};
