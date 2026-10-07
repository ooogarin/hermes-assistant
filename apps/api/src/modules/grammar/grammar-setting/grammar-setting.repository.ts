import { getDatabaseClient } from '../../../core/database/client';
import type { GrammarSettingsRow, UpdateGrammarSettingsPayload } from './grammar-setting.types';

export const getOne = async (): Promise<GrammarSettingsRow> => {
  const database = getDatabaseClient();

  const [row] = await database<GrammarSettingsRow[]>`
    SELECT
      default_level,
      daily_question_count,
      updated_at
    FROM grammar_settings
    ORDER BY
      id ASC
    LIMIT 1
  `;

  if (row === undefined) {
    throw new Error('Grammar settings are missing.');
  }

  return row;
};

export const updateOne = async (input: UpdateGrammarSettingsPayload): Promise<GrammarSettingsRow> => {
  const database = getDatabaseClient();

  const [row] = await database<GrammarSettingsRow[]>`
    UPDATE grammar_settings
    SET
      default_level = CASE WHEN ${input.default_level !== undefined} THEN ${input.default_level ?? ''}::TEXT ELSE default_level END,
      daily_question_count = CASE
        WHEN ${input.daily_question_count !== undefined} THEN ${input.daily_question_count ?? 0}::INTEGER
        ELSE daily_question_count
      END,
      updated_at = NOW()
    WHERE id = (
      SELECT
        id
      FROM grammar_settings
      ORDER BY
        id ASC
      LIMIT 1
    )
    RETURNING
      default_level,
      daily_question_count,
      updated_at
  `;

  if (row === undefined) {
    throw new Error('Grammar settings are missing.');
  }

  return row;
};
