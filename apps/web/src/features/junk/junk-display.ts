import { ApiError } from '../../lib/api/api-error';
import type { JunkItem } from './junk-api';

const truncate = (value: string, length: number): string =>
  value.length > length ? `${value.slice(0, length).trimEnd()}…` : value;

export const getJunkTitle = (item: JunkItem): string =>
  item.title ?? truncate(item.contentText ?? item.sourceUrl ?? item.rawText ?? item.code, 90);

export const getJunkExcerpt = (item: JunkItem): string | null => {
  return item.contentText?.replace(/\s+/g, ' ').trim() || null;
};

export const describeJunkAiError = (error: unknown): string => {
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
      return 'Junk belum bisa disimpan dengan AI. Coba lagi.';
    }

    if (error.code === 'VALIDATION_ERROR') {
      return 'Pesan belum bisa diproses. Periksa panjang teks.';
    }
  }

  return 'Junk belum bisa disimpan dengan AI. Coba lagi.';
};
