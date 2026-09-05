import type { DatabaseTransaction } from '../src/core/database/database.types';

export const up = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`CREATE TYPE writing_source AS ENUM ('cron', 'request')`;
  await trx`
    CREATE TABLE writing_settings (
      id BIGSERIAL PRIMARY KEY,
      default_level TEXT NOT NULL,
      default_word_count INTEGER NOT NULL CHECK (default_word_count > 0),
      min_word_count INTEGER NOT NULL CHECK (min_word_count > 0),
      max_word_count INTEGER NOT NULL CHECK (max_word_count >= min_word_count),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (default_word_count BETWEEN min_word_count AND max_word_count)
    )
  `;
  await trx`
    INSERT INTO writing_settings (
      default_level,
      default_word_count,
      min_word_count,
      max_word_count
    )
    VALUES ('A1', 150, 120, 180)
  `;
  await trx`
    CREATE TABLE writing_materials (
      id BIGSERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      topic TEXT NOT NULL,
      prompt_text TEXT NOT NULL,
      level TEXT NOT NULL,
      genre TEXT NOT NULL,
      tags TEXT[] NOT NULL DEFAULT '{}',
      target_word_count INTEGER NOT NULL CHECK (target_word_count > 0),
      is_override BOOLEAN NOT NULL,
      source writing_source NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    )
  `;
  await trx`
    CREATE TABLE writing_submissions (
      id BIGSERIAL PRIMARY KEY,
      material_id BIGINT NOT NULL REFERENCES writing_materials(id),
      submission_number INTEGER NOT NULL CHECK (submission_number > 0),
      original_text TEXT NOT NULL,
      word_count INTEGER NOT NULL CHECK (word_count > 0),
      estimated_level TEXT NOT NULL,
      analysis JSONB NOT NULL,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      UNIQUE (material_id, submission_number)
    )
  `;
  await trx`
    CREATE INDEX idx_writing_materials_active
    ON writing_materials (created_at DESC)
    WHERE deleted_at IS NULL
  `;
  await trx`
    CREATE INDEX idx_writing_submissions_material
    ON writing_submissions (material_id, submission_number)
    WHERE deleted_at IS NULL
  `;
};

export const down = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`DROP TABLE writing_submissions`;
  await trx`DROP TABLE writing_materials`;
  await trx`DROP TABLE writing_settings`;
  await trx`DROP TYPE writing_source`;
};
