import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { GrammarSessionHeader } from '../../../components/grammar/grammar-session-header';
import { ApiError } from '../../../lib/api/api-error';
import { formatDisplayLabel, formatPercentage } from '../../../lib/formatting/formatters';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getGrammarReport, getGrammarSession } from '../grammar-api';

const GrammarReportPage = () => {
  const { code = '' } = useParams();
  const result = useApiQuery(`grammar-report:${code}`, async (signal) => {
    const [report, session] = await Promise.all([getGrammarReport(code, signal), getGrammarSession(code, signal)]);
    return { report, session };
  });

  return (
    <div>
      <Link
        className='mb-7 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
        to={`/english/grammar/${code}`}
      >
        <ArrowLeft aria-hidden='true' size={18} />
        Kembali ke sesi
      </Link>
      {result.status === 'loading' ? <CollectionSkeleton rows={5} /> : null}
      {result.status === 'error' ? (
        result.error instanceof ApiError && result.error.status === 404 ? (
          <ContentState title='Laporan Grammar tidak ditemukan' description='Periksa kembali sesi yang dibuka.' />
        ) : (
          <ErrorState onRetry={result.retry} />
        )
      ) : null}
      {result.status === 'success' && result.data.report.status !== 'completed' ? (
        <ContentState
          title='Laporan belum tersedia'
          description='Laporan ditampilkan setelah sesi selesai dan hasil evaluasi tersimpan.'
          action={
            <Link className='font-semibold text-primary hover:underline' to={`/english/grammar/${code}`}>
              Kembali ke sesi
            </Link>
          }
        />
      ) : null}
      {result.status === 'success' && result.data.report.status === 'completed' ? (
        <>
          <GrammarSessionHeader session={result.data.session} />
          <div className='mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]'>
            <div className='space-y-5'>
              <section className='rounded-surface border border-border bg-surface p-6 sm:p-8'>
                <p className='text-3xl font-semibold text-primary'>
                  {result.data.report.score ?? 0} / {result.data.report.maxScore ?? result.data.session.questionCount}
                  <span className='ml-2 text-lg text-ink'>benar</span>
                </p>
                <p className='mt-2 text-sm text-ink-muted'>
                  Tinjau area di bawah untuk menentukan fokus latihan berikutnya.
                </p>
              </section>
              <section className='rounded-surface border border-border bg-surface p-6 sm:p-8'>
                <h2 className='text-xl font-semibold text-ink'>Breakdown per area</h2>
                <div className='mt-5 divide-y divide-border'>
                  {result.data.report.breakdown.map((area) => {
                    const total = area.correct + area.partial + area.incorrect;
                    const ratio = total === 0 ? 0 : (area.correct + area.partial * 0.5) / total;
                    return (
                      <div
                        key={area.grammarArea}
                        className='grid gap-3 py-5 sm:grid-cols-[minmax(9rem,1fr)_auto_minmax(12rem,1.3fr)] sm:items-center'
                      >
                        <h3 className='font-medium text-ink'>{formatDisplayLabel(area.grammarArea)}</h3>
                        <p className='text-sm text-ink-muted'>
                          <span className='text-primary'>{area.correct} benar</span> ·{' '}
                          <span className='text-warning'>{area.partial} sebagian</span> ·{' '}
                          <span className='text-danger'>{area.incorrect} salah</span>
                        </p>
                        <div className='flex items-center gap-3'>
                          <div className='h-2 flex-1 overflow-hidden rounded-full bg-border'>
                            <div className='h-full rounded-full bg-primary' style={{ width: `${ratio * 100}%` }} />
                          </div>
                          <span className='w-12 text-right text-sm font-medium text-ink'>
                            {formatPercentage(ratio)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
            <aside className='rounded-surface border border-border bg-surface p-6'>
              <h2 className='text-lg font-semibold text-ink'>Langkah berikutnya</h2>
              <p className='mt-4 text-sm leading-6 text-ink-muted'>
                Gunakan area dengan proporsi terendah sebagai fokus latihan berikutnya melalui Hermes.
              </p>
            </aside>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default GrammarReportPage;
