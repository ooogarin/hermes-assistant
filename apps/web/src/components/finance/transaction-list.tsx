import { ArrowDown, ArrowUp, ReceiptText } from 'lucide-react';
import { formatCurrency } from '../../lib/formatting/formatters';
import type { FinanceTransaction } from '../../features/finance/finance-api';

const timeFormatter = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
const formatTime = (value: string): string => timeFormatter.format(new Date(value)).replace('.', ':');
const transactionColumns = 'md:grid-cols-[7rem_minmax(7rem,0.9fr)_minmax(6rem,0.8fr)_minmax(7rem,1fr)_3.5rem_7rem]';

export const FinanceTransactionList = ({
  dateLabel,
  transactions,
}: {
  dateLabel: string;
  transactions: FinanceTransaction[];
}) => (
  <section
    className='overflow-hidden rounded-surface border border-border bg-surface'
    aria-labelledby='transaction-list'
  >
    <div className='border-b border-border px-5 py-5 sm:px-6'>
      <h2 id='transaction-list' className='text-lg font-semibold text-ink'>
        Transaksi <span className='font-normal text-ink-muted'>· {dateLabel}</span>
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
          className={`hidden gap-3 border-b border-border px-6 py-3 text-xs text-ink-muted md:grid ${transactionColumns}`}
        >
          <span>Jenis</span>
          <span>Nama</span>
          <span>Kategori</span>
          <span>Catatan</span>
          <span>Waktu</span>
          <span className='text-right'>Jumlah</span>
        </div>
        <ul>
          {transactions.map((transaction) => {
            const income = transaction.type === 'income';
            const FlowIcon = income ? ArrowDown : ArrowUp;
            return (
              <li
                key={transaction.dailyNumber}
                className={`grid gap-3 border-b border-border px-5 py-5 last:border-b-0 md:items-center md:px-6 ${transactionColumns}`}
              >
                <div className='flex items-center gap-2 text-sm'>
                  <span
                    className={
                      income
                        ? 'flex size-8 items-center justify-center rounded-full bg-primary-subtle text-primary'
                        : 'flex size-8 items-center justify-center rounded-full bg-danger-subtle text-danger'
                    }
                  >
                    <FlowIcon aria-hidden='true' size={16} />
                  </span>
                  <span>{income ? 'Pemasukan' : 'Pengeluaran'}</span>
                </div>
                <strong className='min-w-0 text-sm font-medium text-ink'>{transaction.name}</strong>
                <span className='min-w-0 text-sm text-ink-muted'>{transaction.category.name}</span>
                <span className='min-w-0 text-sm text-ink-muted'>{transaction.note}</span>
                <span className='text-sm text-ink-muted'>{formatTime(transaction.createdAt)}</span>
                <strong className={income ? 'text-sm text-primary md:text-right' : 'text-sm text-ink md:text-right'}>
                  {income ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </strong>
              </li>
            );
          })}
        </ul>
      </>
    )}
  </section>
);
