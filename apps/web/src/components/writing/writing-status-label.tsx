import { analysisStatusLabels } from '../../features/writing/writing-display';
import { StatusPill } from '../ui/status-pill';

export const WritingStatusLabel = ({ status }: { status: keyof typeof analysisStatusLabels }) => (
  <StatusPill tone={status === 'analyzed' ? 'accent' : 'warning'}>{analysisStatusLabels[status]}</StatusPill>
);
