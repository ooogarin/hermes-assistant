export const analysisStatusLabels = {
  not_analyzed: 'Belum dianalisis',
  analyzed: 'Sudah dianalisis',
};

export const materialStatusLabels = {
  unsubmitted: 'Belum ada tulisan',
  submitted: 'Belum dianalisis',
  reviewed: 'Ada analisis',
};

export const countWritingWords = (text: string): number => {
  const trimmed = text.trim();

  return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
};
