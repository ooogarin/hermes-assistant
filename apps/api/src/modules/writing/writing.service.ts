import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { AppError } from '../../core/errors/app-error';
import { notFoundError } from '../../core/errors/not-found-error';
import { formatPublicCode } from '../../shared/code/public-code';
import { getJakartaDateCodeParts, toIsoTimestamp } from '../../shared/date/date';
import { countWords } from '../../shared/text/word-count';
import * as writingRepository from './writing.repository';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateWritingMaterialPayload,
  CreateWritingMaterialRequest,
  CreateWritingSubmissionPayload,
  CreateWritingSubmissionRequest,
  ListWritingMaterialsQuery,
  ListWritingMaterialsRequest,
  UpdateWritingSettingsPayload,
  UpdateWritingSettingsRequest,
  WritingCorrectedText,
  WritingMaterial,
  WritingMaterialList,
  WritingMaterialListItem,
  WritingMaterialListRow,
  WritingMaterialRow,
  WritingSettings,
  WritingSettingsRow,
  WritingSubmission,
  WritingSubmissionRow,
} from './writing.types';

export const getSettings = async (): Promise<WritingSettings> => {
  return toWritingSettings(await writingRepository.getSettings());
};

export const updateSettings = async (input: UpdateWritingSettingsRequest): Promise<WritingSettings> => {
  const currentSettings = await getSettings();
  const min_word_count = input.min_word_count ?? currentSettings.min_word_count;
  const max_word_count = input.max_word_count ?? currentSettings.max_word_count;
  const default_word_count = input.default_word_count ?? currentSettings.default_word_count;

  if (min_word_count > max_word_count || default_word_count < min_word_count || default_word_count > max_word_count) {
    throw invalidSettings();
  }

  const payload: UpdateWritingSettingsPayload = {
    default_level: input.default_level,
    default_word_count: input.default_word_count,
    min_word_count: input.min_word_count,
    max_word_count: input.max_word_count,
  };

  return toWritingSettings(await writingRepository.updateSettings(payload));
};

export const createMaterial = async (input: CreateWritingMaterialRequest): Promise<WritingMaterial> => {
  const settings = await getSettings();
  let trx: DatabaseReservedConnection | undefined;

  try {
    const date = getJakartaDateCodeParts(new Date());

    trx = await startTransaction();

    const sequenceRow = await writingRepository.getNextSequence(trx, date.key, date.segment);
    const code = formatPublicCode('WR', date.segment, sequenceRow.sequence + 1);
    const is_override =
      input.level !== settings.default_level || input.target_word_count !== settings.default_word_count;
    const payload = toCreateWritingMaterialPayload(input);

    const materialRow = await writingRepository.insertMaterial(trx, code, payload, is_override);
    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return toWritingMaterial(materialRow);
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;
      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }
    throw error;
  }
};

export const listMaterials = async (input: ListWritingMaterialsRequest): Promise<WritingMaterialList> => {
  const query: ListWritingMaterialsQuery = {
    q: input.q,
    status: input.status,
    levels: 'levels' in input ? input.levels : undefined,
    genre: input.genre,
    page: input.page,
    limit: input.limit,
    sort: input.sort,
  };
  const [rows, count] = await Promise.all([
    writingRepository.listMaterials(query),
    writingRepository.countMaterials(query),
  ]);

  return toWritingMaterialList(rows, count.total, input.page, input.limit);
};

export const getMaterial = async (code: string): Promise<WritingMaterial> => {
  const materialRow = await writingRepository.getMaterial(code);

  if (materialRow === null) {
    throw materialNotFound();
  }

  return toWritingMaterial(materialRow);
};

export const createSubmission = async (
  code: string,
  input: CreateWritingSubmissionRequest,
): Promise<WritingSubmission> => {
  await getMaterial(code);
  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const payload: CreateWritingSubmissionPayload = {
      original_text: input.original_text,
      estimated_level: input.estimated_level,
      analysis: input.analysis,
    };
    const submissionRow = await writingRepository.insertSubmission(trx, code, payload, countWords(input.original_text));

    if (submissionRow === null) {
      throw materialNotFound();
    }

    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return toWritingSubmission(submissionRow);
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;
      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }
    throw error;
  }
};

export const getSubmission = async (code: string, submission_number: number): Promise<WritingSubmission> => {
  const submissionRow = await writingRepository.getSubmission(code, submission_number);

  if (submissionRow === null) {
    throw submissionNotFound();
  }

  return toWritingSubmission(submissionRow);
};

export const getCorrectedText = async (code: string, submission_number: number): Promise<WritingCorrectedText> => {
  const submission = await getSubmission(code, submission_number);

  return { submission_number, corrected_text: submission.analysis.corrected_text };
};

// ====================================================================================================
// Helper functions
// ====================================================================================================

const toWritingSettings = (row: WritingSettingsRow): WritingSettings => ({
  default_level: row.default_level,
  default_word_count: row.default_word_count,
  min_word_count: row.min_word_count,
  max_word_count: row.max_word_count,
  updated_at: toIsoTimestamp(row.updated_at),
});

const toCreateWritingMaterialPayload = (input: CreateWritingMaterialRequest): CreateWritingMaterialPayload => ({
  topic: input.topic,
  prompt_text: input.prompt_text,
  level: input.level,
  genre: input.genre,
  tags: input.tags,
  target_word_count: input.target_word_count,
  source: input.source,
});

const toWritingMaterial = (row: WritingMaterialRow): WritingMaterial => ({
  code: row.code,
  topic: row.topic,
  prompt_text: row.prompt_text,
  level: row.level,
  genre: row.genre,
  tags: row.tags,
  target_word_count: row.target_word_count,
  is_override: row.is_override,
  source: row.source,
});

const toWritingSubmission = (row: WritingSubmissionRow): WritingSubmission => ({
  submission_number: row.submission_number,
  original_text: row.original_text,
  word_count: row.word_count,
  estimated_level: row.estimated_level,
  analysis: row.analysis,
  submitted_at: toIsoTimestamp(row.submitted_at),
});

const toWritingMaterialListItem = (row: WritingMaterialListRow): WritingMaterialListItem => ({
  code: row.code,
  topic: row.topic,
  prompt_excerpt: row.prompt_text.length > 200 ? `${row.prompt_text.slice(0, 197)}...` : row.prompt_text,
  genre: row.genre,
  level: row.level,
  target_word_count: row.target_word_count,
  tags: row.tags,
  source: row.source,
  status: Number(row.submission_count) > 0 ? 'reviewed' : 'unsubmitted',
  submission_count: Number(row.submission_count),
  latest_submission_number: row.latest_submission_number === null ? null : Number(row.latest_submission_number),
  created_at: toIsoTimestamp(row.created_at),
});

const toWritingMaterialList = (
  rows: WritingMaterialListRow[],
  totalValue: number | string,
  page: number,
  limit: number,
): WritingMaterialList => {
  const total = Number(totalValue);

  return {
    items: rows.map(toWritingMaterialListItem),
    meta: {
      page,
      limit,
      total,
      total_pages: Math.ceil(total / limit),
    },
  };
};

const invalidSettings = (): AppError => {
  return new AppError({
    code: 'INVALID_WRITING_SETTINGS',
    statusCode: 400,
    message: 'Default word count must be within the configured range',
  });
};

const materialNotFound = (): AppError => {
  return notFoundError('WRITING_MATERIAL_NOT_FOUND', 'Writing material not found');
};

const submissionNotFound = (): AppError => {
  return notFoundError('WRITING_SUBMISSION_NOT_FOUND', 'Writing submission not found');
};
