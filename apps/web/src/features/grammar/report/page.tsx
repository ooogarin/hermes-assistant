import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { ContentState } from '../../../components/feedback/content-state';
import { QueryError } from '../../../components/feedback/query-error';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { GrammarSessionHeader } from '../../../components/grammar/grammar-session-header';
import { GrammarSessionTabs } from '../../../components/grammar/grammar-session-tabs';
import { formatDisplayLabel } from '../../../lib/formatting/formatters';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getGrammarReport, getGrammarSession } from '../grammar-api';
import type { ReactNode } from 'react';
import type { GrammarReport } from '../grammar-api';

const percentageFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0, style: 'percent' });

const SummaryRow = ({ children, label }: { children: ReactNode; label: string }) => (
  <div className='grid min-h-7 grid-cols-[7rem_minmax(0,1fr)] items-center gap-3'>
    <dt className='text-ink-muted'>{label}</dt>
    <dd>{children}</dd>
  </div>
);

const BreakdownBar = ({
  correct,
  incorrect,
  partial,
  total,
}: {
  correct: number;
  incorrect: number;
  partial: number;
  total: number;
}) => {
  const share = (value: number) => (total === 0 ? 0 : (value / total) * 100);

  return (
    <div className='flex h-2 min-w-[7rem] flex-1 overflow-hidden rounded-full bg-border' aria-hidden='true'>
      <div className='bg-primary' style={{ width: `${share(correct)}%` }} />
      <div className='bg-warning' style={{ width: `${share(partial)}%` }} />
      <div className='bg-danger' style={{ width: `${share(incorrect)}%` }} />
    </div>
  );
};

const BreakdownTable = ({ breakdown }: { breakdown: GrammarReport['breakdown'] }) => (
  <div className='mt-5 overflow-x-auto'>
    <table className='w-full min-w-[32rem] text-left text-sm'>
      <thead>
        <tr className='border-b border-border text-xs text-ink-muted'>
          <th className='pb-2 pr-4 font-medium'>Area</th>
          <th className='pb-2 pr-4 text-right font-medium'>Benar</th>
          <th className='pb-2 pr-4 text-right font-medium'>Sebagian</th>
          <th className='pb-2 pr-4 text-right font-medium'>Salah</th>
          <th className='pb-2 font-medium'>Proporsi</th>
        </tr>
      </thead>
      <tbody>
        {breakdown.map((area) => {
          const total = area.correct + area.partial + area.incorrect;
          const ratio = total === 0 ? 0 : (area.correct + area.partial * 0.5) / total;

          return (
            <tr key={area.grammarArea} className='border-b border-border last:border-b-0'>
              <td className='py-3 pr-4 font-medium text-ink'>{formatDisplayLabel(area.grammarArea)}</td>
              <td className='py-3 pr-4 text-right text-primary'>{area.correct}</td>
              <td className='py-3 pr-4 text-right text-warning'>{area.partial}</td>
              <td className='py-3 pr-4 text-right text-danger'>{area.incorrect}</td>
              <td className='py-3'>
                <div className='flex items-center gap-3'>
                  <BreakdownBar
                    correct={area.correct}
                    incorrect={area.incorrect}
                    partial={area.partial}
                    total={total}
                  />
                  <span className='w-12 shrink-0 text-right font-medium text-ink'>
                    {percentageFormatter.format(ratio)}
                  </span>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const sumBreakdown = (breakdown: GrammarReport['breakdown']) =>
  breakdown.reduce(
    (totals, area) => ({
      correct: totals.correct + area.correct,
      incorrect: totals.incorrect + area.incorrect,
      partial: totals.partial + area.partial,
    }),
    { correct: 0, incorrect: 0, partial: 0 },
  );

const GrammarReportPage = () => {
  const { code = '' } = useParams();
  const result = useApiQuery(`grammar-report:${code}`, async (signal) => {
    const [report, session] = await Promise.all([getGrammarReport(code, signal), getGrammarSession(code, signal)]);
    return { report, session };
  });

  const data = result.status === 'success' ? result.data : null;
  const totals = data === null ? null : sumBreakdown(data.report.breakdown);

  return (
    <div>
      <Link
        className='mb-7 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
        to='/english/grammar'
      >
        <ArrowLeft aria-hidden='true' size={18} />
        Semua Grammar
      </Link>
      {result.status === 'loading' ? <CollectionSkeleton rows={5} /> : null}
      {result.status === 'error' ? (
        <QueryError
          error={result.error}
          notFound={{
            title: 'Laporan Grammar tidak ditemukan',
            description: 'Periksa kembali sesi yang dibuka.',
          }}
          onRetry={result.retry}
        />
      ) : null}
      {data !== null && totals !== null ? (
        <>
          <GrammarSessionHeader session={data.session} />
          <GrammarSessionTabs code={code} reportAvailable={data.report.status === 'completed'} />
          {data.report.status !== 'completed' ? (
            <div className='mt-6'>
              <ContentState
                title='Laporan belum tersedia'
                description='Laporan ditampilkan setelah sesi selesai dan hasil evaluasi tersimpan.'
              />
            </div>
          ) : (
            <div className='mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]'>
              <section className='rounded-surface border border-border bg-surface p-6 sm:p-8'>
                <h2 className='text-xl font-semibold text-ink'>Breakdown per area</h2>
                {data.report.breakdown.length === 0 ? (
                  <p className='mt-5 rounded-control bg-surface-subtle px-4 py-5 text-sm text-ink-muted'>
                    Belum ada hasil per area.
                  </p>
                ) : (
                  <BreakdownTable breakdown={data.report.breakdown} />
                )}
              </section>
              <aside className='rounded-surface border border-border bg-surface p-6'>
                <h2 className='text-lg font-semibold text-ink'>Ringkasan hasil</h2>
                <dl className='mt-5 space-y-2 text-sm'>
                  <SummaryRow label='Skor'>
                    <span className='font-semibold text-primary'>
                      {data.report.score ?? 0} / {data.report.maxScore ?? data.session.questionCount}
                    </span>
                  </SummaryRow>
                  <SummaryRow label='Benar'>{totals.correct} soal</SummaryRow>
                  <SummaryRow label='Sebagian'>{totals.partial} soal</SummaryRow>
                  <SummaryRow label='Salah'>{totals.incorrect} soal</SummaryRow>
                  <SummaryRow label='Terjawab'>
                    {totals.correct + totals.partial + totals.incorrect} dari {data.session.questionCount}
                  </SummaryRow>
                </dl>
              </aside>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};

export default GrammarReportPage;
