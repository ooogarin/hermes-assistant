import { Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export const EnglishSettingsLink = ({ to }: { to: string }) => (
  <Link
    className='inline-flex min-h-11 items-center justify-center gap-2 rounded-control border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-subtle'
    to={to}
  >
    <Settings aria-hidden='true' size={18} />
    Pengaturan
  </Link>
);
