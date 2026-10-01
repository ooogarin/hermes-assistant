import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { ReadingList } from '../../components/reading/reading-list';
import { ReadingWorkspace } from '../../components/reading/reading-workspace';
import { getReadingMaterial, getReadingMaterials } from './reading-api';

const material = {
  code: 'RD-20261001-001',
  title: 'A morning market',
  content_text: 'Mira visits the market early every Sunday morning.',
  level: 'A1',
  genre: 'story',
  tags: ['daily-life'],
  target_word_count: 300,
  word_count: 9,
  is_override: false,
  source: 'request',
  questions: [{ question_number: 1, question_text: 'Who visits the market?', user_answer: null }],
};

const mockResponse = (data: unknown) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }),
    ),
  );
};

afterEach(() => {
  vi.unstubAllGlobals();
});

test('renders the title and content from the new Reading detail API fields', async () => {
  mockResponse(material);
  const parsed = await getReadingMaterial(material.code);
  render(
    <MemoryRouter>
      <ReadingWorkspace material={parsed} onSubmit={async () => {}} submitting={false} />
    </MemoryRouter>,
  );

  expect(screen.getByRole('heading', { name: material.title })).toBeInTheDocument();
  expect(screen.getByText(material.content_text)).toBeInTheDocument();
});

test('renders a Reading list link using the title returned by the API', async () => {
  mockResponse({
    items: [
      {
        code: material.code,
        title: material.title,
        genre: material.genre,
        level: material.level,
        target_word_count: material.target_word_count,
        word_count: material.word_count,
        tags: material.tags,
        source: material.source,
        status: 'unanswered',
        question_count: 1,
        answered_question_count: 0,
        created_at: '2026-10-01T10:00:00.000Z',
      },
    ],
    meta: { page: 1, limit: 20, total: 1, total_pages: 1 },
  });
  const parsed = await getReadingMaterials({});
  render(
    <MemoryRouter>
      <ReadingList items={parsed.items} />
    </MemoryRouter>,
  );

  expect(screen.getByRole('link', { name: new RegExp(material.title) })).toHaveAttribute(
    'href',
    `/english/reading/${material.code}`,
  );
});
