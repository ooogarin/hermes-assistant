import { AppError } from '../../../core/errors/app-error';
import { toIsoTimestamp } from '../../../shared/date/date';
import * as writingSettingRepository from './writing-setting.repository';
import type {
  UpdateWritingSettingsPayload,
  UpdateWritingSettingsRequest,
  WritingSettings,
  WritingSettingsRow,
} from './writing-setting.types';

export const getSettings = async (): Promise<WritingSettings> => {
  const settingsRow = await writingSettingRepository.getOne();

  return toWritingSettings(settingsRow);
};

export const updateSettings = async (input: UpdateWritingSettingsRequest): Promise<WritingSettings> => {
  const currentSettings = await getSettings();

  const min_word_count = input.min_word_count ?? currentSettings.min_word_count;
  const max_word_count = input.max_word_count ?? currentSettings.max_word_count;
  const default_word_count = input.default_word_count ?? currentSettings.default_word_count;

  const hasInvalidWordCountRange = min_word_count > max_word_count;
  const isDefaultWordCountOutOfRange = default_word_count < min_word_count || default_word_count > max_word_count;

  if (hasInvalidWordCountRange || isDefaultWordCountOutOfRange) {
    throw invalidSettings();
  }

  const payload: UpdateWritingSettingsPayload = {
    default_level: input.default_level,
    default_word_count: input.default_word_count,
    min_word_count: input.min_word_count,
    max_word_count: input.max_word_count,
  };

  const settingsRow = await writingSettingRepository.updateOne(payload);

  return toWritingSettings(settingsRow);
};

const toWritingSettings = (row: WritingSettingsRow): WritingSettings => ({
  default_level: row.default_level,
  default_word_count: row.default_word_count,
  min_word_count: row.min_word_count,
  max_word_count: row.max_word_count,
  updated_at: toIsoTimestamp(row.updated_at),
});

const invalidSettings = (): AppError => {
  return new AppError({
    code: 'INVALID_WRITING_SETTINGS',
    statusCode: 400,
    message: 'Default word count must be within the configured range',
  });
};
