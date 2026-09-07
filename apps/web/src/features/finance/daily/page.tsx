import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorState } from '../../../components/feedback/content-state';
import { NavigationNotice } from '../../../components/feedback/navigation-notice';
import { FinanceCategoryBreakdown } from '../../../components/finance/category-breakdown';
import { DailyDateControls } from '../../../components/finance/date-controls';
import { FinanceReportSkeleton } from '../../../components/finance/report-skeleton';
import { FinanceSummaryCards } from '../../../components/finance/summary-cards';
import { FinanceTransactionList } from '../../../components/finance/transaction-list';
import { PageHeader } from '../../../components/layout/page-header';
import { ConfirmationDialog } from '../../../components/ui/confirmation-dialog';
import { formatDate } from '../../../lib/formatting/formatters';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { deleteFinanceTransaction, getFinanceSummary, getFinanceTransactions } from '../finance-api';
import { getDateValue, getSafeDate } from '../finance-date';
import type { FinanceTransaction } from '../finance-api';

const FinanceDailyPage = ({ today = new Date() }: { today?: Date }) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const maxDate = getDateValue(today);
  const date = getSafeDate(searchParams.get('date'), today);
  const report = useApiQuery(date, (signal) =>
    Promise.all([getFinanceTransactions(date, signal), getFinanceSummary({ from: date, to: date }, signal)]),
  );
  const [deleteTarget, setDeleteTarget] = useState<FinanceTransaction>();
  const [deleting, setDeleting] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string>();
  const changeDate = (nextDate: string) => setSearchParams({ date: nextDate });

  const remove = async () => {
    if (deleteTarget === undefined) return;
    setDeleting(true);
    setDeleteMessage(undefined);
    try {
      await deleteFinanceTransaction(deleteTarget.date, deleteTarget.dailyNumber);
      setDeleteTarget(undefined);
      setDeleting(false);
      setDeleteMessage('Transaksi berhasil dihapus.');
      report.retry();
    } catch {
      setDeleting(false);
      setDeleteTarget(undefined);
      setDeleteMessage('Transaksi belum dapat dihapus. Coba lagi.');
    }
  };

  return (
    <div className='space-y-7'>
      <NavigationNotice />
      {deleteMessage === undefined ? null : (
        <p className='rounded-control border border-border bg-surface px-4 py-3 text-sm text-ink-muted' role='status'>
          {deleteMessage}
        </p>
      )}
      <PageHeader
        title='Finance'
        description='Pantau transaksi pada tanggal yang dipilih.'
        actions={
          <div className='flex flex-col items-end gap-3'>
            <DailyDateControls date={date} max={maxDate} onChange={changeDate} />
            <div className='flex flex-wrap justify-end gap-4'>
              <Link
                className='inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline'
                to={`/finance/new?date=${date}`}
              >
                <Plus aria-hidden='true' size={17} /> Tambah transaksi
              </Link>
              <Link
                className='text-sm font-medium text-primary hover:underline'
                to={`/finance/report?from=${date.slice(0, 7)}-01&to=${date}`}
              >
                Lihat laporan periode
              </Link>
            </div>
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
            <FinanceTransactionList
              transactions={report.data[0]}
              dateLabel={formatDate(date)}
              editTo={(transaction) => `/finance/transactions/${transaction.date}/${transaction.dailyNumber}/edit`}
              onDelete={setDeleteTarget}
            />
            <FinanceCategoryBreakdown
              byCategory={report.data[1].byCategory}
              expenseTotal={report.data[1].expenseTotal}
              incomeTotal={report.data[1].incomeTotal}
            />
          </div>
        </>
      ) : null}
      <ConfirmationDialog
        description='Transaksi ini tidak akan muncul lagi di laporan Finance.'
        onClose={() => setDeleteTarget(undefined)}
        onConfirm={remove}
        open={deleteTarget !== undefined}
        pending={deleting}
        title={deleteTarget === undefined ? 'Hapus transaksi?' : `Hapus “${deleteTarget.name}”?`}
      />
    </div>
  );
};

export default FinanceDailyPage;
