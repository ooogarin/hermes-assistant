import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FinanceTransactionBatchForm } from '../../../components/finance/transaction-batch-form';
import { createFinanceTransactions } from '../finance-api';
import { getDateValue, getSafeDate } from '../finance-date';
import type { CreateFinanceTransactionsInput } from '../finance-api';

const FinanceCreatePage = ({ today = new Date() }: { today?: Date }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const date = getSafeDate(searchParams.get('date'), today);

  const save = async (values: CreateFinanceTransactionsInput) => {
    await createFinanceTransactions(values);
    navigate(`/finance?date=${values.date}`, {
      replace: true,
      state: { notice: `${values.transactions.length} transaksi berhasil ditambahkan.` },
    });
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
        <h1 className='text-3xl font-semibold tracking-tight text-ink sm:text-4xl'>Tambah transaksi</h1>
      </header>
      <FinanceTransactionBatchForm
        cancelTo={`/finance?date=${date}`}
        initialDate={date}
        maxDate={getDateValue(today)}
        onSubmit={save}
      />
    </div>
  );
};

export default FinanceCreatePage;
