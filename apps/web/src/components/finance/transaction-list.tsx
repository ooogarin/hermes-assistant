import { ReceiptText } from 'lucide-react';
import { formatCurrency } from '../../lib/formatting/formatters';
import type { FinanceTransaction } from '../../features/finance/finance-api';

const transactionColumns = 'lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)_7.25rem_minmax(7rem,0.85fr)]';
const getTransactionNote = ({ location, note }: FinanceTransaction): string => {
  const details = [note, location].filter(
    (value): value is string => value !== null && value.trim() !== '' && value.trim().toLowerCase() !== 'null',
  );

  return details.join(' · ') || '—';
};

export const FinanceTransactionList = ({ transactions }: { transactions: FinanceTransaction[] }) => (
  <section
    className='h-full overflow-hidden rounded-surface border border-border bg-surface'
    aria-labelledby='transaction-list'
  >
    <div className='border-b border-border px-5 py-5 sm:px-6'>
      <h2 id='transaction-list' className='text-xl font-semibold text-ink'>
        Transaksi <span className='text-base font-normal text-ink-muted'>· {transactions.length} transaksi</span>
      </h2>
    </div>
    {transactions.length === 0 ? (
      <div className='flex min-h-64 flex-col items-center justify-center px-6 text-center'>
        <ReceiptText aria-hidden='true' className='text-ink-muted' size={30} strokeWidth={1.6} />
        <h3 className='mt-4 font-semibold text-ink'>Belum ada transaksi</h3>
        <p className='mt-2 text-sm text-ink-muted'>Tidak ada transaksi pada tanggal ini.</p>
      </div>
    ) : (
      <>
        <div
          className={`hidden gap-4 border-b border-border px-6 py-3 text-sm font-medium text-ink-muted lg:grid ${transactionColumns}`}
        >
          <span>Transaksi</span>
          <span>Kategori</span>
          <span>Arus</span>
          <span className='text-right'>Nominal</span>
        </div>
        <ul>
          {transactions.map((transaction) => {
            const income = transaction.type === 'income';
            return (
              <li
                key={transaction.dailyNumber}
                className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-3 border-b border-border px-5 py-5 last:border-b-0 lg:px-6 ${transactionColumns}`}
              >
                <div className='min-w-0'>
                  <strong className='block break-words text-base font-semibold text-ink'>{transaction.name}</strong>
                  <p className='mt-1 break-words text-sm leading-5 text-ink-muted'>{getTransactionNote(transaction)}</p>
                </div>
                <span className='min-w-0 break-words text-base text-ink-muted max-lg:col-start-1'>
                  {transaction.category.name}
                </span>
                <span
                  className={
                    income
                      ? 'w-fit rounded-full border border-primary/15 bg-primary-subtle px-3 py-1 text-sm font-medium text-primary max-lg:col-start-1'
                      : 'w-fit rounded-full border border-danger/15 bg-danger-subtle px-3 py-1 text-sm font-medium text-danger max-lg:col-start-1'
                  }
                >
                  {income ? 'Pemasukan' : 'Pengeluaran'}
                </span>
                <div className='col-start-2 row-span-3 row-start-1 text-right lg:col-start-auto lg:row-span-1 lg:row-start-auto'>
                  <strong
                    className={
                      income ? 'whitespace-nowrap text-base text-primary' : 'whitespace-nowrap text-base text-ink'
                    }
                  >
                    {income ? '+' : '-'}
                    {formatCurrency(transaction.amount)}
                  </strong>
                </div>
              </li>
            );
          })}
        </ul>
      </>
    )}
  </section>
);
