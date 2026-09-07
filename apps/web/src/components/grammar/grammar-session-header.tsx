import { CalendarDays, CircleGauge, FileText, RefreshCw } from 'lucide-react';
import { formatDate } from '../../lib/formatting/formatters';
import type { GrammarSession } from '../../features/grammar/grammar-api';

const modeLabel = { exam: 'Exam', practice: 'Practice' } as const;

export const GrammarSessionHeader = ({ session }: { session: GrammarSession }) => {
  const points = [...new Set(session.questions.map((question) => question.grammarPoint))];
  const focus = points.length === 1 ? points[0] : 'Mixed grammar';

  return (
    <header className='border-b border-border pb-8'>
      <h1 className='font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl'>
        {modeLabel[session.mode]} · {focus}
      </h1>
      <p className='mt-2 text-sm text-ink-muted'>{session.code}</p>
      <dl className='mt-6 flex flex-wrap gap-x-7 gap-y-3 text-sm text-ink-muted'>
        <div className='flex items-center gap-2'>
          <CircleGauge aria-hidden='true' size={18} />
          <dt className='sr-only'>Level</dt>
          <dd>Level {session.level}</dd>
        </div>
        <div className='flex items-center gap-2'>
          <FileText aria-hidden='true' size={18} />
          <dt className='sr-only'>Jumlah soal</dt>
          <dd>{session.questionCount} soal</dd>
        </div>
        <div className='flex items-center gap-2'>
          <CalendarDays aria-hidden='true' size={18} />
          <dt className='sr-only'>Tanggal mulai</dt>
          <dd>{formatDate(session.startedAt)}</dd>
        </div>
        <div className='flex items-center gap-2'>
          <RefreshCw aria-hidden='true' size={18} />
          <dt className='sr-only'>Sumber</dt>
          <dd>{session.source === 'cron' ? 'Daily practice' : 'Request'}</dd>
        </div>
        <div className='rounded-full border border-primary/30 bg-primary-subtle px-3 py-1 font-medium text-primary'>
          <dt className='sr-only'>Status</dt>
          <dd>{session.status === 'active' ? 'Aktif' : session.status === 'completed' ? 'Selesai' : 'Ditinggalkan'}</dd>
        </div>
      </dl>
    </header>
  );
};
