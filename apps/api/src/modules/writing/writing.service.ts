import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { AppError } from '../../core/errors/app-error';
import { getJakartaDateCodeParts } from '../../shared/date/date';
import { countWords } from '../../shared/text/word-count';
import * as writingRepository from './writing.repository';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateWritingMaterialRequest,
  CreateWritingSubmissionRequest,
  ListWritingMaterialsRequest,
  UpdateWritingSettingsRequest,
  WritingCorrectedText,
  WritingMaterial,
  WritingMaterialList,
  WritingSettings,
  WritingSubmission,
} from './writing.types';

export const getSettings = (): Promise<WritingSettings> => writingRepository.getSettings();

export const updateSettings = async (input: UpdateWritingSettingsRequest): Promise<WritingSettings> => {
  const currentSettings = await getSettings();
  const minWordCount = input.minWordCount ?? currentSettings.minWordCount;
  const maxWordCount = input.maxWordCount ?? currentSettings.maxWordCount;
  const defaultWordCount = input.defaultWordCount ?? currentSettings.defaultWordCount;

  if (minWordCount > maxWordCount || defaultWordCount < minWordCount || defaultWordCount > maxWordCount) {
    throw invalidSettings();
  }

  return writingRepository.updateSettings(input);
};

export const createMaterial = async (input: CreateWritingMaterialRequest): Promise<WritingMaterial> => {
  const settings = await getSettings();
  let trx: DatabaseReservedConnection | undefined;

  try {
    const date = getJakartaDateCodeParts(new Date());

    trx = await startTransaction();

    const code = await writingRepository.generateCode(trx, date.key, date.segment);
    const isOverride = input.level !== settings.defaultLevel || input.targetWordCount !== settings.defaultWordCount;

    await writingRepository.insertMaterial(trx, code, input, isOverride);
    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return getMaterial(code);
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;
      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }
    throw error;
  }
};

export const listMaterials = (input: ListWritingMaterialsRequest): Promise<WritingMaterialList> => {
  return writingRepository.listMaterials(input);
};

export const getMaterial = async (code: string): Promise<WritingMaterial> => {
  const material = await writingRepository.getMaterial(code);

  if (material === null) {
    throw materialNotFound();
  }

  return material;
};

export const createSubmission = async (
  code: string,
  input: CreateWritingSubmissionRequest,
): Promise<WritingSubmission> => {
  await getMaterial(code);
  let trx: DatabaseReservedConnection | undefined;

  try {
    trx = await startTransaction();

    const submission = await writingRepository.insertSubmission(trx, code, input, countWords(input.originalText));

    if (submission === null) {
      throw materialNotFound();
    }

    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return submission;
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;
      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }
    throw error;
  }
};

export const getSubmission = async (code: string, submissionNumber: number): Promise<WritingSubmission> => {
  const submission = await writingRepository.getSubmission(code, submissionNumber);

  if (submission === null) {
    throw submissionNotFound();
  }

  return submission;
};

export const getCorrectedText = async (code: string, submissionNumber: number): Promise<WritingCorrectedText> => {
  const submission = await getSubmission(code, submissionNumber);

  return { submissionNumber, correctedText: submission.analysis.correctedText };
};

// ====================================================================================================
// Helper functions
// ====================================================================================================

const invalidSettings = (): AppError => {
  return new AppError({
    code: 'INVALID_WRITING_SETTINGS',
    statusCode: 400,
    message: 'Default word count must be within the configured range',
  });
};

const materialNotFound = (): AppError => {
  return new AppError({
    code: 'WRITING_MATERIAL_NOT_FOUND',
    statusCode: 404,
    message: 'Writing material not found',
  });
};

const submissionNotFound = (): AppError => {
  return new AppError({
    code: 'WRITING_SUBMISSION_NOT_FOUND',
    statusCode: 404,
    message: 'Writing submission not found',
  });
};
