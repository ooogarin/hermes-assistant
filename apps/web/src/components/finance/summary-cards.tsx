import { classNames } from '../../lib/class-names';
import { formatCurrency } from '../../lib/formatting/formatters';

type FinanceSummaryCardsProps = {
  expenseTotal: number;
  incomeTotal: number;
  netTotal: number;
  showNetHint?: boolean;
};

export const FinanceSummaryCards = ({
  expenseTotal,
  incomeTotal,
  netTotal,
  showNetHint = false,
}: FinanceSummaryCardsProps) => {
  const items: Array<{ label: string; signed?: boolean; tone?: 'positive' | 'negative'; value: number }> = [
    { label: 'Pengeluaran', value: expenseTotal },
    { label: 'Pemasukan', value: incomeTotal, tone: 'positive' },
    { label: 'Selisih', value: netTotal, tone: netTotal >= 0 ? 'positive' : 'negative', signed: true },
  ] as const;

  return (
    <section
      className='grid overflow-hidden rounded-surface border border-border bg-surface sm:grid-cols-3'
      aria-label='Ringkasan keuangan'
    >
      {items.map(({ label, signed, tone, value }) => (
        <article
          key={label}
          className='flex min-h-40 flex-col justify-center border-b border-border px-5 py-6 last:border-b-0 sm:border-r sm:border-b-0 sm:px-8 sm:last:border-r-0'
        >
          <p className='text-base font-medium text-ink-muted'>{label}</p>
          <p
            className={classNames(
              'mt-2 text-2xl font-semibold tracking-tight text-ink sm:text-3xl',
              tone === 'positive' && 'text-primary',
              tone === 'negative' && 'text-danger',
            )}
          >
            {signed && value > 0 ? '+' : ''}
            {formatCurrency(value)}
          </p>
          {label === 'Selisih' && showNetHint ? (
            <p className='mt-2 text-base text-ink-muted'>Pemasukan − pengeluaran.</p>
          ) : null}
        </article>
      ))}
    </section>
  );
};
