import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFinanceCategories } from '../../features/finance/finance-api';
import { useApiQuery } from '../../lib/hooks/use-api-query';
import { useUnsavedChanges } from '../../lib/hooks/use-unsaved-changes';
import { Button } from '../ui/button';
import {
  areFinanceTransactionsEqual,
  FinanceTransactionFields,
  isFinanceTransactionValid,
  normalizeFinanceTransaction,
} from './transaction-fields';
import type { FormEvent } from 'react';
import type { FinanceTransactionInput, FinanceTransactionType } from '../../features/finance/finance-api';

export type FinanceTransactionFormValues = FinanceTransactionInput & {
  date: string;
  rawText: string;
  type: FinanceTransactionType;
};

type FinanceTransactionFormProps = {
  cancelTo: string;
  initial: FinanceTransactionFormValues;
  onSubmit: (values: FinanceTransactionFormValues) => Promise<void>;
  submitLabel: string;
};

const toTransaction = ({ date: _date, rawText: _rawText, type: _type, ...transaction }: FinanceTransactionFormValues) =>
  transaction;

export const FinanceTransactionForm = ({ cancelTo, initial, onSubmit, submitLabel }: FinanceTransactionFormProps) => {
  const navigate = useNavigate();
  const [value, setValue] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const categories = useApiQuery(`finance-categories:${initial.type}`, (signal) =>
    getFinanceCategories(initial.type, signal),
  );
  const dirty = !areFinanceTransactionsEqual(value, initial);
  const valid = isFinanceTransactionValid(value);
  const canLeave = useUnsavedChanges(dirty);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!dirty || !valid || categories.status !== 'success') return;
    setSaving(true);
    setError(undefined);
    try {
      await onSubmit({ ...value, ...normalizeFinanceTransaction(value) });
    } catch {
      setError('Transaksi belum dapat disimpan. Coba lagi.');
      setSaving(false);
    }
  };

  return (
    <form className='mt-7 rounded-surface border border-border bg-surface p-6 sm:p-8' onSubmit={submit}>
      <p className='border-b border-border pb-6 text-sm text-ink-muted'>
        {initial.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'} · {initial.date}
      </p>
      <div className='mt-7'>
        <FinanceTransactionFields
          categories={categories.status === 'success' ? categories.data : []}
          disabled={saving || categories.status !== 'success'}
          onChange={(transaction) => setValue((current) => ({ ...current, ...transaction }))}
          value={toTransaction(value)}
        />
      </div>
      {categories.status === 'error' ? (
        <div className='mt-6 flex items-center justify-between gap-3 rounded-control bg-danger-subtle px-4 py-3 text-sm text-danger'>
          <span>Kategori belum dapat dimuat.</span>
          <Button onClick={categories.retry} variant='secondary'>
            Coba lagi
          </Button>
        </div>
      ) : null}
      {!valid && dirty ? (
        <p className='mt-4 text-sm text-danger'>Jumlah, kategori, dan nama transaksi wajib valid.</p>
      ) : null}
      {error === undefined ? null : (
        <p className='mt-4 text-sm text-danger' role='alert'>
          {error}
        </p>
      )}
      <div className='mt-8 flex flex-wrap gap-3'>
        <Button disabled={!dirty || !valid || categories.status !== 'success'} pending={saving} type='submit'>
          {submitLabel}
        </Button>
        <Button disabled={saving} onClick={() => canLeave() && navigate(cancelTo)} variant='secondary'>
          Batal
        </Button>
      </div>
    </form>
  );
};
