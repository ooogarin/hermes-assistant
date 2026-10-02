import { Hono } from 'hono';
import { appValidator } from '../../core/http/validator';
import * as writingHandler from './writing.handler';
import {
  createMaterialSchema,
  createSubmissionSchema,
  listMaterialsSchema,
  materialCodeSchema,
  submissionParamsSchema,
} from './writing.validator';
import { createWritingSettingRoutes } from './writing-setting/writing-setting.route';
import type { AppEnv } from '../../core/http/app-env';

export const createWritingRoutes = () => {
  const route = new Hono<AppEnv>();

  route.route('/settings', createWritingSettingRoutes());
  route.post('/materials', appValidator('json', createMaterialSchema), writingHandler.createMaterial);
  route.get('/materials', appValidator('query', listMaterialsSchema), writingHandler.listMaterials);
  route.get('/materials/:code', appValidator('param', materialCodeSchema), writingHandler.getMaterial);
  route.post(
    '/materials/:code/submissions',
    appValidator('param', materialCodeSchema),
    appValidator('json', createSubmissionSchema),
    writingHandler.createSubmission,
  );
  route.get(
    '/materials/:code/submissions/:submission_number',
    appValidator('param', submissionParamsSchema),
    writingHandler.getSubmission,
  );
  route.get(
    '/materials/:code/submissions/:submission_number/corrected-text',
    appValidator('param', submissionParamsSchema),
    writingHandler.getCorrectedText,
  );

  return route;
};
