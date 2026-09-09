import { classNames } from '../../lib/class-names';
import { formatCurrency } from '../../lib/formatting/formatters';

type FinanceSummaryCardsProps = {
  expenseTotal: number;
  incomeTotal: number;
  layout?: 'horizontal' | 'vertical';
  netTotal: number;
};

export const FinanceSummaryCards = ({
  expenseTotal,
  incomeTotal,
  layout = 'horizontal',
  netTotal,
}: FinanceSummaryCardsProps) => {
  const items: Array<{ label: string; signed?: boolean; tone?: 'positive' | 'negative'; value: number }> = [
    { label: 'Pengeluaran', value: expenseTotal },
    { label: 'Pemasukan', value: incomeTotal, tone: 'positive' },
    { label: 'Selisih', value: netTotal, tone: netTotal >= 0 ? 'positive' : 'negative', signed: true },
  ] as const;

  return (
    <section
      className={classNames(
        'grid overflow-hidden rounded-surface border border-border bg-surface',
        layout === 'horizontal' ? 'sm:grid-cols-3' : 'h-full grid-rows-3',
      )}
      aria-label='Ringkasan keuangan'
    >
      {items.map(({ label, signed, tone, value }) => (
        <article
          key={label}
          className={classNames(
            'border-b border-border px-5 py-6 last:border-b-0 sm:px-7',
            layout === 'horizontal' && 'sm:border-r sm:border-b-0 sm:last:border-r-0',
          )}
        >
          <p className='text-sm text-ink-muted'>{label}</p>
          <p
            className={classNames(
              'mt-2 text-2xl font-semibold tracking-tight text-ink',
              tone === 'positive' && 'text-primary',
              tone === 'negative' && 'text-danger',
            )}
          >
            {signed && value > 0 ? '+' : ''}
            {formatCurrency(value)}
          </p>
        </article>
      ))}
    </section>
  );
};
