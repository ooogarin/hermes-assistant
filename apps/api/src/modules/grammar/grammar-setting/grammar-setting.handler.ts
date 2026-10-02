import { getBody } from '../../../core/http/request';
import { successResponse } from '../../../core/http/response';
import * as grammarSettingService from './grammar-setting.service';
import { updateSettingsSchema } from './grammar-setting.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../../core/http/app-env';

export const getSettings = async (context: Context<AppEnv>) => {
  const result = await grammarSettingService.getSettings();

  return successResponse({ context, data: result });
};

export const updateSettings = async (context: Context<AppEnv>) => {
  const input = getBody(context, updateSettingsSchema);

  const result = await grammarSettingService.updateSettings(input);

  return successResponse({ context, data: result });
};
