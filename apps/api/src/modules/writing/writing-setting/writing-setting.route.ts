import { Hono } from 'hono';
import { appValidator } from '../../../core/http/validator';
import * as writingSettingHandler from './writing-setting.handler';
import { updateSettingsSchema } from './writing-setting.validator';
import type { AppEnv } from '../../../core/http/app-env';

export const createWritingSettingRoutes = () => {
  const route = new Hono<AppEnv>();

  route.get('/', writingSettingHandler.getSettings);
  route.patch('/', appValidator('json', updateSettingsSchema), writingSettingHandler.updateSettings);

  return route;
};
