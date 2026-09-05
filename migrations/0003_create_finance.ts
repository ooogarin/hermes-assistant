import type { DatabaseTransaction } from '../src/core/database/database.types';

export const up = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`
    CREATE TYPE transaction_type AS ENUM ('expense', 'income')
  `;
  await trx`
    CREATE TABLE categories (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      type transaction_type NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE
    )
  `;
  await trx`
    CREATE TABLE transactions (
      id BIGSERIAL PRIMARY KEY,
      batch_id UUID NOT NULL,
      type transaction_type NOT NULL,
      amount INTEGER NOT NULL CHECK (amount > 0),
      category_id INTEGER NOT NULL REFERENCES categories(id),
      name TEXT NOT NULL,
      location TEXT,
      note TEXT,
      date DATE NOT NULL,
      daily_number INTEGER NOT NULL CHECK (daily_number > 0),
      raw_text TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      UNIQUE (date, daily_number)
    )
  `;
  await trx`
    INSERT INTO categories (code, name, description, type)
    VALUES
      ('food_drink', 'Makanan & Minuman', 'Food, drinks, coffee, snacks, restaurants, warungs, cafes.', 'expense'),
      ('transport', 'Transportasi', 'Ride-hailing, taxi, fuel, parking, tolls, public transport.', 'expense'),
      ('shopping', 'Belanja', 'Personal items, clothes, accessories, non-routine needs.', 'expense'),
      ('bills', 'Tagihan', 'Electricity, internet, phone credit, subscriptions, installments, routine bills.', 'expense'),
      ('entertainment', 'Hiburan', 'Movies, games, concerts, hangouts, recreation.', 'expense'),
      ('health', 'Kesehatan', 'Medicine, doctor visits, vitamins, checkups, medical needs.', 'expense'),
      ('education', 'Pendidikan', 'Courses, books, classes, learning tools.', 'expense'),
      ('gift_donation', 'Hadiah/Donasi', 'Gifts, special treats, donations, contributions.', 'expense'),
      ('other_expense', 'Lainnya', 'Expenses that do not fit any other category.', 'expense'),
      ('salary', 'Gaji', 'Monthly salary or stable income.', 'income'),
      ('freelance', 'Freelance', 'Project payments, services, or freelance work.', 'income'),
      ('bonus', 'Bonus', 'Bonuses, THR, incentives, commissions.', 'income'),
      ('refund', 'Refund', 'Refunds or reimbursements.', 'income'),
      ('other_income', 'Lainnya', 'Income that does not fit any other income category.', 'income')
  `;
  await trx`
    CREATE INDEX idx_transactions_date_active
    ON transactions (date, id)
    WHERE deleted_at IS NULL
  `;
  await trx`
    CREATE INDEX idx_transactions_category_active
    ON transactions (category_id)
    WHERE deleted_at IS NULL
  `;
  await trx`
    CREATE INDEX idx_transactions_batch
    ON transactions (batch_id)
  `;
};

export const down = async (trx: DatabaseTransaction): Promise<void> => {
  await trx`DROP TABLE transactions`;
  await trx`DROP TABLE categories`;
  await trx`DROP TYPE transaction_type`;
};
