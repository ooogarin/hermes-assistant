import { Hono } from 'hono';
import { appValidator } from '../../../core/http/validator';
import * as readingSettingHandler from './reading-setting.handler';
import { updateSettingsSchema } from './reading-setting.validator';
import type { AppEnv } from '../../../core/http/app-env';

export const createReadingSettingRoutes = () => {
  const route = new Hono<AppEnv>();

  route.get('/', readingSettingHandler.getSettings);
  route.patch('/', appValidator('json', updateSettingsSchema), readingSettingHandler.updateSettings);

  return route;
};
