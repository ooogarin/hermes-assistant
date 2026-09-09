import { AppError } from '../../core/errors/app-error';

export const noteNotFound = (): AppError => {
  return new AppError({
    code: 'NOTE_NOT_FOUND',
    statusCode: 404,
    message: 'Note not found',
  });
};
