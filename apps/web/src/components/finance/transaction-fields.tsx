import { Button } from '../ui/button';
import { TextField } from '../ui/form-field';
import type { FinanceCategory, FinanceTransactionInput } from '../../features/finance/finance-api';

type TransactionFieldsProps = {
  categories: FinanceCategory[];
  disabled: boolean;
  index?: number;
  onChange: (value: FinanceTransactionInput) => void;
  onRemove?: () => void;
  value: FinanceTransactionInput;
};

export const emptyFinanceTransaction = (): FinanceTransactionInput => ({
  amount: 0,
  categoryCode: '',
  location: null,
  name: '',
  note: null,
});

export const isFinanceTransactionValid = (transaction: FinanceTransactionInput): boolean =>
  Number.isInteger(transaction.amount) &&
  transaction.amount > 0 &&
  transaction.amount <= 2_147_483_647 &&
  transaction.categoryCode.length > 0 &&
  transaction.name.trim().length > 0;

export const areFinanceTransactionsEqual = (left: FinanceTransactionInput, right: FinanceTransactionInput): boolean =>
  left.amount === right.amount &&
  left.categoryCode === right.categoryCode &&
  left.location === right.location &&
  left.name === right.name &&
  left.note === right.note;

export const normalizeFinanceTransaction = (transaction: FinanceTransactionInput): FinanceTransactionInput => ({
  ...transaction,
  location: transaction.location?.trim() || null,
  name: transaction.name.trim(),
  note: transaction.note?.trim() || null,
});

const optionalValue = (value: string): string | null => value || null;

export const FinanceTransactionFields = ({
  categories,
  disabled,
  index,
  onChange,
  onRemove,
  value,
}: TransactionFieldsProps) => {
  const update = <Key extends keyof FinanceTransactionInput>(key: Key, nextValue: FinanceTransactionInput[Key]) =>
    onChange({ ...value, [key]: nextValue });

  return (
    <fieldset className='grid gap-6' disabled={disabled}>
      {index === undefined ? null : (
        <>
          <legend className='sr-only'>Transaksi {index + 1}</legend>
          <div className='flex items-center justify-between gap-4'>
            <span aria-hidden='true' className='text-base font-semibold text-ink'>
              Transaksi {index + 1}
            </span>
            {onRemove === undefined ? null : (
              <Button onClick={onRemove} variant='ghost'>
                Hapus transaksi
              </Button>
            )}
          </div>
        </>
      )}
      <div className='grid gap-5 sm:grid-cols-2'>
        <TextField
          label='Jumlah (Rupiah)'
          max={2_147_483_647}
          min={1}
          onChange={(event) => update('amount', event.target.valueAsNumber)}
          required
          type='number'
          value={Number.isNaN(value.amount) ? '' : value.amount}
        />
        <label className='grid gap-2 text-sm font-medium text-ink'>
          Kategori
          <select
            className='min-h-12 rounded-control border border-border bg-surface px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:bg-surface-subtle'
            onChange={(event) => update('categoryCode', event.target.value)}
            required
            value={value.categoryCode}
          >
            <option value=''>Pilih kategori</option>
            {categories.map((category) => (
              <option key={category.code} value={category.code}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <TextField
        label='Nama transaksi'
        maxLength={300}
        onChange={(event) => update('name', event.target.value)}
        required
        value={value.name}
      />
      <div className='grid gap-5 sm:grid-cols-2'>
        <TextField
          label='Lokasi'
          maxLength={2_000}
          onChange={(event) => update('location', optionalValue(event.target.value))}
          value={value.location ?? ''}
        />
        <TextField
          label='Catatan'
          maxLength={2_000}
          onChange={(event) => update('note', optionalValue(event.target.value))}
          value={value.note ?? ''}
        />
      </div>
    </fieldset>
  );
};
