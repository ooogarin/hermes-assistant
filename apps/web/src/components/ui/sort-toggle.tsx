import { ArrowDownUp } from 'lucide-react';
import { Button } from './button';

type SortToggleProps = {
  className?: string;
  onToggle: () => void;
  sort: 'newest' | 'oldest';
};

/** The button that switches a list between the newest and the oldest record. */
export const SortToggle = ({ className = 'h-12', onToggle, sort }: SortToggleProps) => (
  <Button className={className} variant='secondary' onClick={onToggle}>
    Urutkan: {sort === 'oldest' ? 'Terlama' : 'Terbaru'} <ArrowDownUp aria-hidden='true' size={17} />
  </Button>
);
