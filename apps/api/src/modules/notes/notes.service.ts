import { commitTransaction, rollbackTransaction, startTransaction } from '../../core/database/client';
import { formatPublicCode } from '../../shared/code/public-code';
import { getJakartaDateCodeParts, toIsoTimestamp } from '../../shared/date/date';
import { noteNotFound } from '../../shared/errors/note-errors';
import { formatTaxonomyLabel } from '../../shared/text/taxonomy';
import * as notesRepository from './notes.repository';
import type { DatabaseReservedConnection } from '../../core/database/database.types';
import type {
  CreateNotePayload,
  CreateNoteRequest,
  ListNotesRepositoryQuery,
  ListNotesRequest,
  Note,
  NoteReferenceRequest,
  NoteRow,
  UpdateNotePayload,
  UpdateNoteRequest,
} from './notes.types';

export const create = async (input: CreateNoteRequest): Promise<Note> => {
  let trx: DatabaseReservedConnection | undefined;

  try {
    const date = getJakartaDateCodeParts(new Date());
    trx = await startTransaction();

    const sequenceRow = await notesRepository.getNextSequence(trx, date.key, date.segment);
    const code = formatPublicCode('NT', date.segment, sequenceRow.sequence + 1);
    const payload: CreateNotePayload = {
      title: input.title,
      content_text: input.content_text,
      raw_text: input.raw_text,
      type: input.type,
      category: input.category,
      source_name: input.source_name,
      source_url: input.source_url,
      source_context: input.source_context,
      source_reference: input.source_reference,
      tags: input.tags,
    };
    const noteRow = await notesRepository.insert(trx, code, payload);
    const trxToCommit = trx;
    trx = undefined;

    await commitTransaction(trxToCommit);

    return toNote(noteRow);
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
  const noteRow = await notesRepository.findByCode(code);

  if (noteRow === null) {
    throw noteNotFound();
  }

  return toNote(noteRow);
};

export const list = async (input: ListNotesRequest): Promise<Note[]> => {
  const query: ListNotesRepositoryQuery = {
    q: input.q,
    type: input.type,
    tag: input.tag,
    category: input.category,
    source: input.source,
    from: input.from,
    to: input.to,
    sort: input.sort,
    limit: input.limit,
  };

  const rows = await notesRepository.getAll(query);
  return rows.map(toNote);
};

export const update = async ({ code }: NoteReferenceRequest, input: UpdateNoteRequest): Promise<Note> => {
  const payload: UpdateNotePayload = {
    title: input.title,
    content_text: input.content_text,
    type: input.type,
    category: input.category,
    source_name: input.source_name,
    source_url: input.source_url,
    source_context: input.source_context,
    source_reference: input.source_reference,
    tags: input.tags,
  };
  const noteRow = await notesRepository.updateByCode(code, payload);

  if (noteRow === null) {
    throw noteNotFound();
  }

  return toNote(noteRow);
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

const toNote = (row: NoteRow): Note => ({
  code: row.code,
  title: row.title,
  content_text: row.content_text,
  raw_text: row.raw_text,
  type: row.type,
  category: formatTaxonomyLabel(row.category),
  source_name: row.source_name,
  source_url: row.source_url,
  source_context: row.source_context,
  source_reference: row.source_reference,
  tags: row.tags.map(formatTaxonomyLabel),
  created_at: toIsoTimestamp(row.created_at),
  updated_at: toIsoTimestamp(row.updated_at),
  deleted_at: row.deleted_at === null ? null : toIsoTimestamp(row.deleted_at),
});
