import { ApiError } from './api-error';

const retrieveMessage = (subject: string): string => `${subject} belum bisa disimpan dengan AI. Coba lagi.`;

/**
 * Maps the safe AI error codes to Indonesian copy for the capture screens.
 * `subject` is the user-facing record name, such as "Junk" or "Catatan".
 */
export const describeAiCaptureError = (error: unknown, subject: string): string => {
  if (error instanceof ApiError) {
    if (error.code === 'AI_NOT_CONFIGURED') {
      return 'Fitur AI belum dikonfigurasi di server.';
    }

    if (error.code === 'AI_AUTH_FAILED') {
      return 'Kredensial AI ditolak. Periksa AI_API_KEY di server.';
    }

    if (error.code === 'AI_CONFIGURATION_ERROR') {
      return 'Konfigurasi AI tidak cocok. Periksa AI_BASE_URL dan AI_MODEL.';
    }

    if (error.code === 'AI_RATE_LIMITED') {
      return 'AI sedang membatasi permintaan. Coba lagi sebentar lagi.';
    }

    if (error.code === 'AI_UNAVAILABLE' || error.code === 'AI_INVALID_RESPONSE') {
      return retrieveMessage(subject);
    }

    if (error.code === 'VALIDATION_ERROR') {
      return 'Pesan belum bisa diproses. Periksa panjang teks.';
    }
  }

  return retrieveMessage(subject);
};
