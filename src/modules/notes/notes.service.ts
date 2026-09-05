import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { AppError } from '../../core/errors/app-error';
import { getJakartaDateCodeParts } from '../../shared/date/date';
import * as notesRepository from './notes.repository';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type { CreateNoteRequest, ListNotesRequest, Note, NoteReferenceRequest, UpdateNoteRequest } from './notes.types';

export const create = async (input: CreateNoteRequest): Promise<Note> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    const date = getJakartaDateCodeParts(new Date());
    trx = await startTransaction();

    const code = await notesRepository.generateCode(trx, date.key, date.segment);
    const note = await notesRepository.insert(trx, code, input);
    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return note;
  } catch (error) {
    if (trx !== undefined) {
      const trxToRollback = trx;
      trx = undefined;

      await rollbackTransaction(trxToRollback).catch(() => undefined);
    }

    throw error;
  }
};

export const getDetail = async ({ code }: NoteReferenceRequest): Promise<Note> => {
  const note = await notesRepository.findByCode(code);

  if (note === null) {
    throw noteNotFound();
  }

  return note;
};

export const list = (input: ListNotesRequest): Promise<Note[]> => notesRepository.getAll(input);

export const update = async ({ code }: NoteReferenceRequest, input: UpdateNoteRequest): Promise<Note> => {
  const note = await notesRepository.updateByCode(code, input);

  if (note === null) {
    throw noteNotFound();
  }

  return note;
};

export const remove = async ({ code }: NoteReferenceRequest): Promise<void> => {
  const deleted = await notesRepository.softDeleteByCode(code);

  if (!deleted) {
    throw noteNotFound();
  }
};

// ====================================================================================================
// Helper functions
// ====================================================================================================

const noteNotFound = (): AppError => {
  return new AppError({
    code: 'NOTE_NOT_FOUND',
    statusCode: 404,
    message: 'Note not found',
  });
};
