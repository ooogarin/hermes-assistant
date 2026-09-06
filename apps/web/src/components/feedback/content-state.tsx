import { CloudAlert, FileQuestion, SearchX } from 'lucide-react';
import { Button } from '../ui/button';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type ContentStateProps = {
  action?: ReactNode;
  description: string;
  icon?: LucideIcon;
  title: string;
};

export const ContentState = ({ action, description, icon: Icon = FileQuestion, title }: ContentStateProps) => (
  <section className='flex min-h-80 flex-col items-center justify-center rounded-surface border border-border bg-surface px-6 py-12 text-center'>
    <span className='inline-flex size-14 items-center justify-center rounded-surface border border-border text-ink-muted'>
      <Icon aria-hidden='true' size={28} strokeWidth={1.75} />
    </span>
    <h2 className='mt-6 text-xl font-semibold text-ink'>{title}</h2>
    <p className='mt-2 max-w-md text-sm leading-6 text-ink-muted'>{description}</p>
    {action === undefined ? null : <div className='mt-6'>{action}</div>}
  </section>
);

export const NoResultsState = ({ onClear }: { onClear: () => void }) => (
  <ContentState
    title='Tidak ada hasil yang cocok'
    description='Coba gunakan kata kunci atau filter lain.'
    icon={SearchX}
    action={
      <Button variant='secondary' onClick={onClear}>
        Hapus pencarian
      </Button>
    }
  />
);

export const ErrorState = ({ onRetry }: { onRetry: () => void }) => (
  <ContentState
    title='Konten belum dapat dimuat'
    description='Periksa koneksi lalu coba lagi.'
    icon={CloudAlert}
    action={<Button onClick={onRetry}>Coba lagi</Button>}
  />
);
