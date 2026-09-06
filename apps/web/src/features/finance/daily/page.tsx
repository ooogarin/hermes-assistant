import { Link, useSearchParams } from 'react-router-dom';
import { ErrorState } from '../../../components/feedback/content-state';
import { FinanceCategoryBreakdown } from '../../../components/finance/category-breakdown';
import { DailyDateControls } from '../../../components/finance/date-controls';
import { FinanceReportSkeleton } from '../../../components/finance/report-skeleton';
import { FinanceSummaryCards } from '../../../components/finance/summary-cards';
import { FinanceTransactionList } from '../../../components/finance/transaction-list';
import { PageHeader } from '../../../components/layout/page-header';
import { formatDate } from '../../../lib/formatting/formatters';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getFinanceSummary, getFinanceTransactions } from '../finance-api';
import { getDateValue, getSafeDate } from '../finance-date';

const FinanceDailyPage = ({ today = new Date() }: { today?: Date }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const maxDate = getDateValue(today);
  const date = getSafeDate(searchParams.get('date'), today);
  const report = useApiQuery(date, (signal) =>
    Promise.all([getFinanceTransactions(date, signal), getFinanceSummary({ from: date, to: date }, signal)]),
  );
  const changeDate = (nextDate: string) => setSearchParams({ date: nextDate });

  return (
    <div className='space-y-7'>
      <PageHeader
        title='Finance'
        description='Pantau transaksi pada tanggal yang dipilih.'
        actions={
          <div className='flex flex-col items-end gap-3'>
            <DailyDateControls date={date} max={maxDate} onChange={changeDate} />
            <Link
              className='text-sm font-medium text-primary hover:underline'
              to={`/finance/report?from=${date.slice(0, 7)}-01&to=${date}`}
            >
              Lihat laporan periode
            </Link>
          </div>
        }
      />

      {report.status === 'loading' ? <FinanceReportSkeleton /> : null}
      {report.status === 'error' ? <ErrorState onRetry={report.retry} /> : null}
      {report.status === 'success' ? (
        <>
          <FinanceSummaryCards
            expenseTotal={report.data[1].expenseTotal}
            incomeTotal={report.data[1].incomeTotal}
            netTotal={report.data[1].netTotal}
          />
          <div className='grid items-start gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(20rem,0.9fr)]'>
            <FinanceTransactionList transactions={report.data[0]} dateLabel={formatDate(date)} />
            <FinanceCategoryBreakdown
              byCategory={report.data[1].byCategory}
              expenseTotal={report.data[1].expenseTotal}
              incomeTotal={report.data[1].incomeTotal}
            />
          </div>
        </>
      ) : null}
    </div>
  );
};

export default FinanceDailyPage;
