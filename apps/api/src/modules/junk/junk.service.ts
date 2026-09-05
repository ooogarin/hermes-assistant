import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { AppError } from '../../core/errors/app-error';
import { getJakartaDateCodeParts } from '../../shared/date/date';
import * as junkRepository from './junk.repository';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateJunkRequest,
  JunkItem,
  JunkReferenceRequest,
  ListJunkRequest,
  UpdateJunkRequest,
} from './junk.types';

export const create = async (input: CreateJunkRequest): Promise<JunkItem> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    const date = getJakartaDateCodeParts(new Date());
    trx = await startTransaction();

    const code = await junkRepository.generateCode(trx, date.key, date.segment);
    const junkItem = await junkRepository.insert(trx, code, input);
    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return junkItem;
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const getDetail = async ({ code }: JunkReferenceRequest): Promise<JunkItem> => {
  const junkItem = await junkRepository.findByCode(code);

  if (junkItem === null) {
    throw junkItemNotFound();
  }

  return junkItem;
};

export const list = (input: ListJunkRequest): Promise<JunkItem[]> => junkRepository.getAll(input);

export const update = async ({ code }: JunkReferenceRequest, input: UpdateJunkRequest): Promise<JunkItem> => {
  const junkItem = await junkRepository.updateByCode(code, input);

  if (junkItem === null) {
    throw junkItemNotFound();
  }

  return junkItem;
};

export const remove = async ({ code }: JunkReferenceRequest): Promise<void> => {
  const deleted = await junkRepository.softDeleteByCode(code);

  if (!deleted) {
    throw junkItemNotFound();
  }
};

// ====================================================================================================
// Helper functions
// ====================================================================================================

const junkItemNotFound = (): AppError => {
  return new AppError({
    code: 'JUNK_ITEM_NOT_FOUND',
    statusCode: 404,
    message: 'Junk item not found',
  });
};
