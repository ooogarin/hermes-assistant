import { Hono } from 'hono';
import { createWritingMaterialRoutes } from './writing-material/writing-material.route';
import { createWritingSettingRoutes } from './writing-setting/writing-setting.route';
import { createWritingSubmissionRoutes } from './writing-submission/writing-submission.route';
import type { AppEnv } from '../../core/http/app-env';

export const createWritingRoutes = () => {
  const route = new Hono<AppEnv>();

  route.route('/settings', createWritingSettingRoutes());
  route.route('/materials', createWritingMaterialRoutes());
  route.route('/submissions', createWritingSubmissionRoutes());

  return route;
};
