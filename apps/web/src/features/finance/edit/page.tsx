import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ContentState, ErrorState } from '../../../components/feedback/content-state';
import { CollectionSkeleton } from '../../../components/feedback/skeleton';
import { FinanceTransactionForm } from '../../../components/finance/transaction-form';
import { ApiError } from '../../../lib/api/api-error';
import { useApiQuery } from '../../../lib/hooks/use-api-query';
import { getFinanceTransaction, updateFinanceTransaction } from '../finance-api';
import type { FinanceTransactionFormValues } from '../../../components/finance/transaction-form';
import type { FinanceTransaction, UpdateFinanceTransactionInput } from '../finance-api';

const toFormValues = (transaction: FinanceTransaction): FinanceTransactionFormValues => ({
  amount: transaction.amount,
  categoryCode: transaction.category.code,
  date: transaction.date,
  location: transaction.location,
  name: transaction.name,
  note: transaction.note,
  rawText: transaction.rawText,
  type: transaction.type,
});

const FinanceEditPage = () => {
  const { dailyNumber = '', date = '' } = useParams();
  const navigate = useNavigate();
  const number = Number(dailyNumber);
  const transaction = useApiQuery(`finance-edit:${date}:${dailyNumber}`, (signal) =>
    getFinanceTransaction(date, number, signal),
  );

  const save = async (values: FinanceTransactionFormValues, current: FinanceTransaction) => {
    const input: UpdateFinanceTransactionInput = {};
    if (values.amount !== current.amount) input.amount = values.amount;
    if (values.categoryCode !== current.category.code) input.categoryCode = values.categoryCode;
    if (values.name !== current.name) input.name = values.name;
    if (values.location !== current.location) input.location = values.location;
    if (values.note !== current.note) input.note = values.note;
    await updateFinanceTransaction(date, number, input);
    navigate(`/finance?date=${date}`, { replace: true, state: { notice: 'Transaksi berhasil diperbarui.' } });
  };

  return (
    <div className='mx-auto w-full max-w-4xl'>
      <Link
        className='inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline'
        to={`/finance?date=${date}`}
      >
        <ArrowLeft aria-hidden='true' size={18} /> Kembali ke Finance
      </Link>
      <header className='mt-7 border-b border-border pb-7'>
        <h1 className='text-3xl font-semibold tracking-tight text-ink sm:text-4xl'>Edit transaksi</h1>
        <p className='mt-3 text-base text-ink-muted'>
          {date} · Transaksi #{dailyNumber}
        </p>
      </header>
      {transaction.status === 'loading' ? (
        <div className='mt-7'>
          <CollectionSkeleton rows={5} />
        </div>
      ) : null}
      {transaction.status === 'error' ? (
        <div className='mt-7'>
          {transaction.error instanceof ApiError && transaction.error.status === 404 ? (
            <ContentState title='Transaksi tidak ditemukan' description='Transaksi ini mungkin sudah tidak tersedia.' />
          ) : (
            <ErrorState onRetry={transaction.retry} />
          )}
        </div>
      ) : null}
      {transaction.status === 'success' ? (
        <FinanceTransactionForm
          cancelTo={`/finance?date=${date}`}
          initial={toFormValues(transaction.data)}
          onSubmit={(values) => save(values, transaction.data)}
          submitLabel='Simpan perubahan'
        />
      ) : null}
    </div>
  );
};

export default FinanceEditPage;
