import { Plus } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { ErrorState } from '../../../components/feedback/content-state';
import { NavigationNotice } from '../../../components/feedback/navigation-notice';
import { FinanceCategoryBreakdown } from '../../../components/finance/category-breakdown';
import { DailyDateControls } from '../../../components/finance/date-controls';
import { FinanceToolbar } from '../../../components/finance/finance-toolbar';
import { FinanceReportSkeleton } from '../../../components/finance/report-skeleton';
import { FinanceSummaryCards } from '../../../components/finance/summary-cards';
import { FinanceTransactionList } from '../../../components/finance/transaction-list';
import { PageHeader } from '../../../components/layout/page-header';
import { ButtonLink } from '../../../components/ui/button-link';
import { getDateValue, getSafeDate } from '../../../lib/formatting/dates';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getFinanceSummary, getFinanceTransactions } from '../finance-api';

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
      <NavigationNotice />
      <PageHeader title='Finance' />
      <FinanceToolbar
        controls={<DailyDateControls date={date} max={maxDate} onChange={changeDate} />}
        actions={
          <>
            <ButtonLink
              className='min-h-11 px-4 text-sm sm:min-h-13 sm:px-5 sm:text-base'
              label='Laporan periode'
              to={`/finance/report?from=${date.slice(0, 7)}-01&to=${date}`}
              variant='secondary'
            />
            <ButtonLink
              className='min-h-11 px-4 text-sm sm:min-h-13 sm:px-5 sm:text-base'
              icon={<Plus aria-hidden='true' size={18} />}
              label='Tambah transaksi'
              to={`/finance/new?date=${date}`}
            />
          </>
        }
      />

      {report.status === 'loading' ? <FinanceReportSkeleton /> : null}
      {report.status === 'error' ? <ErrorState onRetry={report.retry} /> : null}
      {report.status === 'success' ? (
        <div className='space-y-5'>
          <FinanceSummaryCards
            expenseTotal={report.data[1].expenseTotal}
            incomeTotal={report.data[1].incomeTotal}
            netTotal={report.data[1].netTotal}
            showNetHint
          />
          <div className='grid items-stretch gap-5 xl:min-h-[36rem] xl:grid-cols-[minmax(0,1.9fr)_minmax(18rem,1fr)]'>
            <FinanceTransactionList transactions={report.data[0]} />
            <FinanceCategoryBreakdown
              byCategory={report.data[1].byCategory}
              expenseTotal={report.data[1].expenseTotal}
              incomeTotal={report.data[1].incomeTotal}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FinanceDailyPage;
