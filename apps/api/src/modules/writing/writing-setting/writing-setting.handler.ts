import { getBody } from '../../../core/http/request';
import { successResponse } from '../../../core/http/response';
import * as writingSettingService from './writing-setting.service';
import { updateSettingsSchema } from './writing-setting.validator';
import type { Context } from 'hono';
import type { AppEnv } from '../../../core/http/app-env';

export const getSettings = async (context: Context<AppEnv>) => {
  const result = await writingSettingService.getSettings();

  return successResponse({ context, data: result });
};

export const updateSettings = async (context: Context<AppEnv>) => {
  const input = getBody(context, updateSettingsSchema);

  const result = await writingSettingService.updateSettings(input);

  return successResponse({ context, data: result });
};
