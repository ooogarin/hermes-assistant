import { getDatabaseClient } from '../../../core/database/client';
import type { UpdateWritingSettingsPayload, WritingSettingsRow } from './writing-setting.types';

export const getOne = async (): Promise<WritingSettingsRow> => {
  const database = getDatabaseClient();

  const [row] = await database<WritingSettingsRow[]>`
    SELECT
      default_level,
      default_word_count,
      min_word_count,
      max_word_count,
      updated_at
    FROM writing_settings
    ORDER BY
      id ASC
    LIMIT 1
  `;

  if (row === undefined) {
    throw new Error('Writing settings are missing.');
  }

  return row;
};

export const updateOne = async (input: UpdateWritingSettingsPayload): Promise<WritingSettingsRow> => {
  const database = getDatabaseClient();

  const allowedColumns = ['default_level', 'default_word_count', 'min_word_count', 'max_word_count'] as const;

  const [row] = await database<WritingSettingsRow[]>`
    UPDATE writing_settings
    SET
      ${database(input, ...allowedColumns)},
      updated_at = NOW()
    WHERE id = (
      SELECT
        id
      FROM writing_settings
      ORDER BY
        id ASC
      LIMIT 1
    )
    RETURNING
      default_level,
      default_word_count,
      min_word_count,
      max_word_count,
      updated_at
  `;

  if (row === undefined) {
    throw new Error('Writing settings are missing.');
  }

  return row;
};
