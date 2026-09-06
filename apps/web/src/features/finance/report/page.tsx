import { CalendarClock, ChevronRight } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorState } from '../../../components/feedback/content-state';
import { FinanceCategoryBreakdown } from '../../../components/finance/category-breakdown';
import { DateInput } from '../../../components/finance/date-controls';
import { FinanceReportSkeleton } from '../../../components/finance/report-skeleton';
import { FinanceSummaryCards } from '../../../components/finance/summary-cards';
import { PageHeader } from '../../../components/layout/page-header';
import { ApiError } from '../../../lib/api/api-error';
import { formatCurrency, formatDate } from '../../../lib/formatting/formatters';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getFinanceDailySummary, getFinanceSummary } from '../finance-api';
import { getDateValue, getSafeRange } from '../finance-date';

const DailySummaryList = ({ rows }: { rows: Awaited<ReturnType<typeof getFinanceDailySummary>> }) => (
  <section className='overflow-hidden rounded-surface border border-border bg-surface' aria-labelledby='daily-summary'>
    <div className='border-b border-border px-5 py-5 sm:px-6'>
      <h2 id='daily-summary' className='text-lg font-semibold text-ink'>
        Rekap per tanggal
      </h2>
    </div>
    {rows.length === 0 ? (
      <p className='px-6 py-16 text-center text-sm text-ink-muted'>Belum ada aktivitas pada periode ini.</p>
    ) : (
      <>
        <div className='hidden grid-cols-[1fr_1fr_1fr_1fr_2rem] gap-4 border-b border-border px-6 py-3 text-xs text-ink-muted sm:grid'>
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
                className='grid gap-2 px-5 py-6 transition-colors hover:bg-primary-subtle sm:grid-cols-[1fr_1fr_1fr_1fr_2rem] sm:items-center sm:gap-4 sm:px-6'
                to={`/finance?date=${row.date}`}
                aria-label={`Buka transaksi ${formatDate(row.date)}`}
              >
                <strong className='text-sm font-medium text-ink'>{formatDate(row.date)}</strong>
                <span className='text-sm text-ink'>
                  <span className='mr-2 text-xs text-ink-muted sm:hidden'>Pengeluaran</span>
                  {formatCurrency(row.expenseTotal)}
                </span>
                <span className='text-sm text-ink'>
                  <span className='mr-2 text-xs text-ink-muted sm:hidden'>Pemasukan</span>
                  {formatCurrency(row.incomeTotal)}
                </span>
                <span className={row.netTotal >= 0 ? 'text-sm text-primary' : 'text-sm text-danger'}>
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
      <PageHeader
        title='Laporan Finance'
        description='Tinjau ringkasan transaksi harian dalam satu periode.'
        actions={
          <div className='flex flex-col items-end gap-3'>
            <div className='flex flex-col gap-2 sm:flex-row'>
              <DateInput
                label='Tanggal mulai'
                max={range.to}
                onChange={(from) => setRange({ from })}
                value={range.from}
              />
              <DateInput
                label='Tanggal akhir'
                max={maxDate}
                min={range.from}
                onChange={(to) => setRange({ to })}
                value={range.to}
              />
            </div>
            <Link className='text-sm font-medium text-primary hover:underline' to={`/finance?date=${range.to}`}>
              {range.to === maxDate ? 'Lihat transaksi hari ini' : `Lihat transaksi ${formatDate(range.to)}`}
            </Link>
          </div>
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
          <div className='grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(22rem,0.95fr)]'>
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
