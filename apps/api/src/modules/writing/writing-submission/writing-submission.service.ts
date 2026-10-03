import { commitTransaction, rollbackTransaction, startTransaction } from '../../../core/database/client';
import { AppError } from '../../../core/errors/app-error';
import { notFoundError } from '../../../core/errors/not-found-error';
import { formatPublicCode } from '../../../shared/code/public-code';
import { getJakartaDateCodeParts, toIsoTimestamp } from '../../../shared/date/date';
import { countWords } from '../../../shared/text/word-count';
import { getMaterialReference } from '../writing-material/writing-material.service';
import * as writingSubmissionRepository from './writing-submission.repository';
import type { DatabaseReservedConnection } from '../../../core/database/database.types';
import type {
  CreateWritingSubmissionPayload,
  CreateWritingSubmissionRequest,
  ListWritingSubmissionsRequest,
  SaveWritingAnalysisPayload,
  SaveWritingAnalysisRequest,
  UpdateWritingSubmissionPayload,
  UpdateWritingSubmissionRequest,
  WritingCorrectedText,
  WritingPaginationMeta,
  WritingSubmission,
  WritingSubmissionList,
  WritingSubmissionRow,
} from './writing-submission.types';

export const createSubmission = async (input: CreateWritingSubmissionRequest): Promise<WritingSubmission> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const materialCode = input.material_code ?? null;
    const material = materialCode === null ? null : await getMaterialReference(materialCode, trx);

    const date = getJakartaDateCodeParts(new Date());
    const sequence = await writingSubmissionRepository.getLastSequenceByDateForUpdate(date.key, date.segment, trx);
    const code = formatPublicCode('WS', date.segment, sequence.sequence + 1);

    const payload: CreateWritingSubmissionPayload = {
      material_id: material?.id ?? null,
      material_code: materialCode,
      original_text: input.original_text,
      word_count: countWords(input.original_text),
    };

    const row = await writingSubmissionRepository.insertOne(code, payload, trx);

    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return toWritingSubmission(row);
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const listSubmissions = async (input: ListWritingSubmissionsRequest): Promise<WritingSubmissionList> => {
  const [rows, count] = await Promise.all([
    writingSubmissionRepository.getAll(input),
    writingSubmissionRepository.countAll(input),
  ]);

  return {
    items: rows.map((row) => ({
      code: row.code,
      material_code: row.material_code,
      text_excerpt: row.text_excerpt,
      word_count: row.word_count,
      estimated_topic: row.estimated_topic,
      estimated_genre: row.estimated_genre,
      estimated_tags: row.estimated_tags,
      estimated_level: row.estimated_level,
      analysis_status: row.analysis_status,
      created_at: toIsoTimestamp(row.created_at),
      updated_at: toIsoTimestamp(row.updated_at),
    })),
    meta: toPaginationMeta(count.total, input.page, input.limit),
  };
};

export const getSubmission = async (code: string): Promise<WritingSubmission> => {
  const row = await writingSubmissionRepository.getOneByCode(code);

  if (row === null) {
    throw submissionNotFound();
  }

  return toWritingSubmission(row);
};

export const updateSubmission = async (
  code: string,
  input: UpdateWritingSubmissionRequest,
): Promise<WritingSubmission> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const current = await writingSubmissionRepository.getOneByCodeForUpdate(code, trx);

    if (current === null) {
      throw submissionNotFound();
    }

    // Reject the whole patch when text is supplied after analysis, even if the text is unchanged.
    const editsText = input.original_text !== undefined;
    const editsLockedText = editsText && current.analysis !== null;

    if (editsLockedText) {
      throw writingConflict('WRITING_SUBMISSION_TEXT_LOCKED', 'Analyzed writing text cannot be changed');
    }

    const payload: UpdateWritingSubmissionPayload = {
      ...input,
      word_count: input.original_text === undefined ? undefined : countWords(input.original_text),
    };

    const row = await writingSubmissionRepository.updateOne(code, current.material_code, payload, trx);

    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return toWritingSubmission(row);
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const saveAnalysis = async (code: string, input: SaveWritingAnalysisRequest): Promise<WritingSubmission> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const current = await writingSubmissionRepository.getOneByCodeForUpdate(code, trx);

    if (current === null) {
      throw submissionNotFound();
    }

    if (current.analysis !== null) {
      throw writingConflict('WRITING_SUBMISSION_ALREADY_ANALYZED', 'Writing submission is already analyzed');
    }

    const hasMaterial = current.material_code !== null;
    const hasPromptAdherence = input.analysis.prompt_adherence !== null;
    const hasInvalidPromptAdherence = hasMaterial !== hasPromptAdherence;

    if (hasInvalidPromptAdherence) {
      throw new AppError({
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        message: 'Prompt adherence must match the submission writing type',
      });
    }

    const payload: SaveWritingAnalysisPayload = {
      estimated_topic: input.estimated_topic,
      estimated_genre: input.estimated_genre,
      estimated_tags: input.estimated_tags,
      estimated_level: input.estimated_level,
      analysis: input.analysis,
    };

    const row = await writingSubmissionRepository.updateOneAnalysis(code, current.material_code, payload, trx);

    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return toWritingSubmission(row);
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const getCorrectedText = async (code: string): Promise<WritingCorrectedText> => {
  const submission = await getSubmission(code);

  if (submission.analysis === null) {
    throw writingConflict('WRITING_SUBMISSION_NOT_ANALYZED', 'Writing submission has not been analyzed');
  }

  return { code, corrected_text: submission.analysis.corrected_text };
};

// Helpers

const toWritingSubmission = (row: WritingSubmissionRow): WritingSubmission => ({
  code: row.code,
  material_code: row.material_code,
  original_text: row.original_text,
  word_count: row.word_count,
  estimated_topic: row.estimated_topic,
  estimated_genre: row.estimated_genre,
  estimated_tags: row.estimated_tags,
  estimated_level: row.estimated_level,
  analysis_status: row.analysis === null ? 'not_analyzed' : 'analyzed',
  analysis: row.analysis,
  analyzed_at: row.analyzed_at === null ? null : toIsoTimestamp(row.analyzed_at),
  created_at: toIsoTimestamp(row.created_at),
  updated_at: toIsoTimestamp(row.updated_at),
});

const toPaginationMeta = (totalValue: number | string, page: number, limit: number): WritingPaginationMeta => {
  const total = Number(totalValue);

  return { page, limit, total, total_pages: Math.ceil(total / limit) };
};

const writingConflict = (code: string, message: string): AppError => {
  return new AppError({ code, statusCode: 409, message });
};

const submissionNotFound = (): AppError => {
  return notFoundError('WRITING_SUBMISSION_NOT_FOUND', 'Writing submission not found');
};
