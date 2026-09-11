import { WalletCards } from 'lucide-react';
import { formatCurrency, formatPercentage } from '../../lib/formatting/formatters';
import { ProgressBar } from '../ui/progress-bar';
import type { FinanceSummary } from '../../features/finance/finance-api';

type Props = Pick<FinanceSummary, 'byCategory' | 'expenseTotal' | 'incomeTotal'>;

const CategoryGroup = ({
  categories,
  title,
  total,
}: {
  categories: FinanceSummary['byCategory'];
  title: string;
  total: number;
}) => (
  <section className='border-t border-border pt-5 first:border-t-0 first:pt-0' aria-label={title}>
    <div className='mb-4 flex items-center justify-between gap-4'>
      <h3 className='text-base font-semibold text-ink'>{title}</h3>
      <strong className='text-base text-ink'>{formatCurrency(total)}</strong>
    </div>
    {categories.length === 0 ? (
      <p className='rounded-control bg-surface-subtle px-4 py-5 text-sm text-ink-muted'>Belum ada transaksi.</p>
    ) : (
      <ul className='space-y-5'>
        {categories.map(({ category, total: categoryTotal }) => {
          const ratio = total === 0 ? 0 : categoryTotal / total;
          return (
            <li key={category.code} className='space-y-2'>
              <div className='grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 text-base'>
                <span className='truncate font-medium text-ink'>{category.name}</span>
                <span className='text-ink-muted'>{formatCurrency(categoryTotal)}</span>
                <span className='w-12 text-right text-ink-muted'>{formatPercentage(ratio)}</span>
              </div>
              <ProgressBar label={`Proporsi ${category.name}`} value={ratio * 100} />
            </li>
          );
        })}
      </ul>
    )}
  </section>
);

export const FinanceCategoryBreakdown = ({ byCategory, expenseTotal, incomeTotal }: Props) => (
  <aside
    className='h-full rounded-surface border border-border bg-surface p-5 sm:p-6'
    aria-labelledby='category-summary'
  >
    <div className='mb-6 flex items-center gap-3'>
      <WalletCards aria-hidden='true' className='text-primary' size={20} />
      <h2 id='category-summary' className='text-xl font-semibold text-ink'>
        Ringkasan kategori
      </h2>
    </div>
    <div className='space-y-6'>
      <CategoryGroup
        title='Pengeluaran'
        total={expenseTotal}
        categories={byCategory.filter(({ category }) => category.type === 'expense')}
      />
      <CategoryGroup
        title='Pemasukan'
        total={incomeTotal}
        categories={byCategory.filter(({ category }) => category.type === 'income')}
      />
    </div>
  </aside>
);
