import { Hono } from 'hono';
import { appValidator } from '../../../core/http/validator';
import * as grammarSettingHandler from './grammar-setting.handler';
import { updateSettingsSchema } from './grammar-setting.validator';
import type { AppEnv } from '../../../core/http/app-env';

export const createGrammarSettingRoutes = () => {
  const route = new Hono<AppEnv>();

  route.get('/', grammarSettingHandler.getSettings);
  route.patch('/', appValidator('json', updateSettingsSchema), grammarSettingHandler.updateSettings);

  return route;
};
