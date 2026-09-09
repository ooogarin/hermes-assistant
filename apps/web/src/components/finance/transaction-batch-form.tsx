import { Plus } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFinanceCategories } from '../../features/finance/finance-api';
import { useApiQuery } from '../../lib/hooks/use-api-query';
import { useUnsavedChanges } from '../../lib/hooks/use-unsaved-changes';
import { Button } from '../ui/button';
import { TextAreaField, TextField } from '../ui/form-field';
import {
  areFinanceTransactionsEqual,
  emptyFinanceTransaction,
  FinanceTransactionFields,
  isFinanceTransactionValid,
  normalizeFinanceTransaction,
} from './transaction-fields';
import type { FormEvent } from 'react';
import type {
  CreateFinanceTransactionsInput,
  FinanceTransactionInput,
  FinanceTransactionType,
} from '../../features/finance/finance-api';

type TransactionRow = FinanceTransactionInput & { id: number };

type TransactionBatchFormProps = {
  cancelTo: string;
  initialDate: string;
  maxDate: string;
  onSubmit: (value: CreateFinanceTransactionsInput) => Promise<void>;
};

const createRow = (id: number): TransactionRow => ({ id, ...emptyFinanceTransaction() });
const withoutId = ({ id: _id, ...transaction }: TransactionRow): FinanceTransactionInput => transaction;

export const FinanceTransactionBatchForm = ({
  cancelTo,
  initialDate,
  maxDate,
  onSubmit,
}: TransactionBatchFormProps) => {
  const navigate = useNavigate();
  const nextId = useRef(1);
  const [date, setDate] = useState(initialDate);
  const [type, setType] = useState<FinanceTransactionType>('expense');
  const [rawText, setRawText] = useState('');
  const [rows, setRows] = useState<TransactionRow[]>([createRow(0)]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const categories = useApiQuery(`finance-categories:${type}`, (signal) => getFinanceCategories(type, signal));
  const dirty =
    date !== initialDate ||
    type !== 'expense' ||
    rawText.length > 0 ||
    rows.length > 1 ||
    rows.some((row) => !areFinanceTransactionsEqual(withoutId(row), emptyFinanceTransaction()));
  const valid =
    date.length > 0 &&
    rawText.trim().length > 0 &&
    rows.length > 0 &&
    rows.length <= 100 &&
    rows.every(isFinanceTransactionValid);
  const canLeave = useUnsavedChanges(dirty);

  const changeType = (nextType: FinanceTransactionType) => {
    setType(nextType);
    setRows((current) => current.map((row) => ({ ...row, categoryCode: '' })));
  };

  const updateRow = (id: number, value: FinanceTransactionInput) => {
    setRows((current) => current.map((row) => (row.id === id ? { id, ...value } : row)));
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || !valid || categories.status !== 'success') return;
    setSaving(true);
    setError(undefined);
    try {
      await onSubmit({
        date,
        rawText: rawText.trim(),
        transactions: rows.map(withoutId).map(normalizeFinanceTransaction),
        type,
      });
    } catch {
      setError('Transaksi belum dapat disimpan. Coba lagi.');
      setSaving(false);
    }
  };

  return (
    <form className='mt-7 grid gap-6' onSubmit={submit}>
      <section className='rounded-surface border border-border bg-surface p-6 sm:p-8'>
        <div className='grid gap-5 sm:grid-cols-2'>
          <TextField
            disabled={saving}
            label='Tanggal'
            max={maxDate}
            onChange={(event) => setDate(event.target.value)}
            required
            type='date'
            value={date}
          />
          <label className='grid gap-2 text-sm font-medium text-ink'>
            Jenis
            <select
              className='min-h-12 rounded-control border border-border bg-surface px-4 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15'
              disabled={saving}
              onChange={(event) => changeType(event.target.value as FinanceTransactionType)}
              value={type}
            >
              <option value='expense'>Pengeluaran</option>
              <option value='income'>Pemasukan</option>
            </select>
          </label>
        </div>
        <TextAreaField
          className='mt-6'
          disabled={saving}
          helper='Teks asli yang menjadi dasar seluruh transaksi dalam batch ini'
          label='Teks sumber'
          maxLength={20_000}
          onChange={(event) => setRawText(event.target.value)}
          required
          value={rawText}
        />
      </section>

      <div className='grid gap-5'>
        {rows.map((row, index) => (
          <section key={row.id} className='rounded-surface border border-border bg-surface p-6 sm:p-8'>
            <FinanceTransactionFields
              categories={categories.status === 'success' ? categories.data : []}
              disabled={saving || categories.status !== 'success'}
              index={index}
              onChange={(value) => updateRow(row.id, value)}
              onRemove={
                rows.length === 1 ? undefined : () => setRows((current) => current.filter(({ id }) => id !== row.id))
              }
              value={withoutId(row)}
            />
          </section>
        ))}
      </div>

      {categories.status === 'error' ? (
        <div className='flex items-center justify-between gap-3 rounded-control bg-danger-subtle px-4 py-3 text-sm text-danger'>
          <span>Kategori belum dapat dimuat.</span>
          <Button onClick={categories.retry} variant='secondary'>
            Coba lagi
          </Button>
        </div>
      ) : null}
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <Button
          className='border-dashed'
          disabled={saving || rows.length >= 100}
          onClick={() => setRows((current) => [...current, createRow(nextId.current++)])}
          variant='secondary'
        >
          <Plus aria-hidden='true' size={17} /> Tambah transaksi
        </Button>
        <div className='flex flex-wrap gap-3'>
          <Button disabled={saving} onClick={() => canLeave() && navigate(cancelTo)} variant='secondary'>
            Batal
          </Button>
          <Button disabled={!dirty || !valid || categories.status !== 'success'} pending={saving} type='submit'>
            Simpan {rows.length} transaksi
          </Button>
        </div>
      </div>
      {!valid && dirty ? (
        <p className='text-sm text-danger'>
          Tanggal, teks sumber, jumlah, kategori, dan nama setiap transaksi wajib valid.
        </p>
      ) : null}
      {error === undefined ? null : (
        <p className='text-sm text-danger' role='alert'>
          {error}
        </p>
      )}
    </form>
  );
};
