import { analysisStatusLabels } from '../../features/writing/writing-display';

export const WritingStatusLabel = ({ status }: { status: keyof typeof analysisStatusLabels }) => (
  <span
    className={
      status === 'analyzed'
        ? 'inline-flex shrink-0 rounded-full border border-primary/25 bg-primary-subtle px-2 py-1 text-xs font-medium text-primary'
        : 'inline-flex shrink-0 rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700'
    }
  >
    {analysisStatusLabels[status]}
  </span>
);
