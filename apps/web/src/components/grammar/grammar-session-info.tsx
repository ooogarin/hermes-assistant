import { grammarSessionStatusLabels, grammarSourceLabels } from '../../features/grammar/grammar-display';
import { formatDate } from '../../lib/formatting/formatters';
import { CopyButton } from '../ui/copy-button';
import type { ReactNode } from 'react';
import type { GrammarSession } from '../../features/grammar/grammar-api';

type GrammarSessionInfoProps = {
  answeredCount: number;
  session: GrammarSession;
  showScore: boolean;
};

const SessionMetaRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className='grid min-h-7 grid-cols-[8rem_minmax(0,1fr)] items-center gap-3'>
    <dt className='text-ink-muted'>{label}</dt>
    <dd>{children}</dd>
  </div>
);

/** The details of the session that is open. */
export const GrammarSessionInfo = ({ answeredCount, session, showScore }: GrammarSessionInfoProps) => (
  <aside className='rounded-surface border border-border bg-surface p-6'>
    <div className='flex flex-wrap items-center justify-between gap-3'>
      <h2 className='text-lg font-semibold text-ink'>Sesi ini</h2>
      <span className='rounded-full border border-primary/30 bg-primary-subtle px-3 py-1 text-sm font-medium text-primary'>
        {grammarSessionStatusLabels[session.status]}
      </span>
    </div>
    <section className='mt-6 border-t border-border pt-6' aria-label='Informasi Sesi'>
      <dl className='space-y-2 text-sm'>
        <SessionMetaRow label='Kode'>
          <span className='flex min-w-0 flex-wrap items-center gap-2'>
            <span className='break-all text-sm text-ink-muted'>{session.code}</span>
            <CopyButton value={session.code} label='Salin kode sesi' />
          </span>
        </SessionMetaRow>
        <SessionMetaRow label='Level'>{session.level}</SessionMetaRow>
        <SessionMetaRow label='Jumlah soal'>{session.questionCount} soal</SessionMetaRow>
        <SessionMetaRow label='Terjawab'>
          {answeredCount} dari {session.questionCount}
        </SessionMetaRow>
        <SessionMetaRow label='Tanggal'>{formatDate(session.startedAt)}</SessionMetaRow>
        <SessionMetaRow label='Sumber'>{grammarSourceLabels[session.source]}</SessionMetaRow>
        {showScore ? (
          <SessionMetaRow label='Skor'>
            <span className='font-semibold text-primary'>
              {session.score} / {session.maxScore}
            </span>
          </SessionMetaRow>
        ) : null}
      </dl>
    </section>
    <p className='mt-6 border-t border-border pt-6 text-sm leading-6 text-ink-muted'>
      {session.mode === 'practice'
        ? 'Practice memberikan umpan balik melalui evaluasi Hermes setelah setiap jawaban.'
        : 'Jawaban exam disimpan tanpa hasil dan dinilai bersama setelah sesi selesai.'}
    </p>
  </aside>
);
