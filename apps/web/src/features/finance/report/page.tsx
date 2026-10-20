import { CalendarClock, ChevronRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorState } from '../../../components/feedback/content-state';
import { FinanceCategoryBreakdown } from '../../../components/finance/category-breakdown';
import { RangeDateControls } from '../../../components/finance/date-controls';
import { FinanceToolbar } from '../../../components/finance/finance-toolbar';
import { FinanceReportSkeleton } from '../../../components/finance/report-skeleton';
import { FinanceSummaryCards } from '../../../components/finance/summary-cards';
import { PageHeader } from '../../../components/layout/page-header';
import { ButtonLink } from '../../../components/ui/button-link';
import { ApiError } from '../../../lib/api/api-error';
import { getDateValue, getSafeRange } from '../../../lib/formatting/dates';
import { formatCurrency, formatDate } from '../../../lib/formatting/formatters';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getFinanceDailySummary, getFinanceSummary } from '../finance-api';

const DailySummaryList = ({ rows }: { rows: Awaited<ReturnType<typeof getFinanceDailySummary>> }) => (
  <section className='overflow-hidden rounded-surface border border-border bg-surface' aria-labelledby='daily-summary'>
    <div className='border-b border-border px-5 py-5 sm:px-6'>
      <h2 id='daily-summary' className='text-xl font-semibold text-ink'>
        Rekap per tanggal
      </h2>
    </div>
    {rows.length === 0 ? (
      <p className='px-6 py-16 text-center text-sm text-ink-muted'>Belum ada aktivitas pada periode ini.</p>
    ) : (
      <>
        <div className='hidden grid-cols-[1fr_1fr_1fr_1fr_2rem] gap-4 border-b border-border px-6 py-3 text-sm font-medium text-ink-muted sm:grid'>
          <span>Tanggal</span>
          <span>Pengeluaran</span>
          <span>Pemasukan</span>
          <span>Selisih</span>
          <span />
        </div>
        <ul>
          {rows.map((row) => (
            <li key={row.date} className='border-b border-border last:border-b-0'>
              <Link
                className='grid gap-2 px-5 py-6 transition-colors hover:bg-primary-subtle sm:grid-cols-[1fr_1fr_1fr_1fr_2rem] sm:items-start sm:gap-4 sm:px-6'
                to={`/finance?date=${row.date}`}
                aria-label={`Buka transaksi ${formatDate(row.date)}`}
              >
                <strong className='text-base font-medium text-ink'>{formatDate(row.date)}</strong>
                <span className='text-base text-ink'>
                  <span className='mr-2 text-xs text-ink-muted sm:hidden'>Pengeluaran</span>
                  {formatCurrency(row.expenseTotal)}
                </span>
                <span className='text-base text-ink'>
                  <span className='mr-2 text-xs text-ink-muted sm:hidden'>Pemasukan</span>
                  {formatCurrency(row.incomeTotal)}
                </span>
                <span className={row.netTotal >= 0 ? 'text-base text-primary' : 'text-base text-danger'}>
                  {row.netTotal > 0 ? '+' : ''}
                  {formatCurrency(row.netTotal)}
                </span>
                <ChevronRight aria-hidden='true' className='hidden text-primary sm:block' size={18} />
              </Link>
            </li>
          ))}
        </ul>
      </>
    )}
  </section>
);

const DailySummaryUnavailable = () => (
  <section className='flex min-h-80 flex-col items-center justify-center rounded-surface border border-border bg-surface px-6 text-center'>
    <CalendarClock aria-hidden='true' className='text-ink-muted' size={30} strokeWidth={1.6} />
    <h2 className='mt-4 text-lg font-semibold text-ink'>Rekap harian belum tersedia</h2>
    <p className='mt-2 max-w-md text-sm leading-6 text-ink-muted'>
      Ringkasan periode tetap dapat dilihat. Daftar per tanggal akan tersedia setelah API rekap harian ditambahkan.
    </p>
  </section>
);

const FinanceReportPage = ({ today = new Date() }: { today?: Date }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const maxDate = getDateValue(today);
  const range = getSafeRange(searchParams.get('from'), searchParams.get('to'), today);
  const queryKey = `${range.from}:${range.to}`;
  const summary = useApiQuery(queryKey, (signal) => getFinanceSummary(range, signal));
  const daily = useApiQuery(queryKey, (signal) => getFinanceDailySummary(range, signal));
  const setRange = (next: Partial<typeof range>) => setSearchParams({ ...range, ...next });
  const unavailable = daily.status === 'error' && daily.error instanceof ApiError && daily.error.status === 404;

  return (
    <div className='space-y-7'>
      <PageHeader title='Laporan Finance' />
      <FinanceToolbar
        controls={
          <RangeDateControls
            from={range.from}
            max={maxDate}
            onFromChange={(from) => setRange({ from })}
            onToChange={(to) => setRange({ to })}
            to={range.to}
          />
        }
        actions={
          <ButtonLink
            className='min-h-11 px-4 text-sm sm:min-h-13 sm:px-5 sm:text-base'
            label={range.to === maxDate ? 'Lihat transaksi hari ini' : `Lihat transaksi ${formatDate(range.to)}`}
            to={`/finance?date=${range.to}`}
            variant='secondary'
          />
        }
      />

      {summary.status === 'loading' ? <FinanceReportSkeleton /> : null}
      {summary.status === 'error' ? <ErrorState onRetry={summary.retry} /> : null}
      {summary.status === 'success' ? (
        <>
          <FinanceSummaryCards
            expenseTotal={summary.data.expenseTotal}
            incomeTotal={summary.data.incomeTotal}
            netTotal={summary.data.netTotal}
          />
          <div className='grid items-stretch gap-5 xl:min-h-[36rem] xl:grid-cols-[minmax(0,1.8fr)_minmax(18rem,1fr)]'>
            {daily.status === 'loading' ? <FinanceReportSkeleton compact /> : null}
            {unavailable ? <DailySummaryUnavailable /> : null}
            {daily.status === 'error' && !unavailable ? <ErrorState onRetry={daily.retry} /> : null}
            {daily.status === 'success' ? <DailySummaryList rows={daily.data} /> : null}
            <FinanceCategoryBreakdown
              byCategory={summary.data.byCategory}
              expenseTotal={summary.data.expenseTotal}
              incomeTotal={summary.data.incomeTotal}
            />
          </div>
        </>
      ) : null}
    </div>
  );
};

export default FinanceReportPage;
