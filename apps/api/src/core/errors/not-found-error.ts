import { AppError } from './app-error';

export const notFoundError = (code: string, message: string): AppError => {
  return new AppError({
    code,
    statusCode: 404,
    message,
  });
};
