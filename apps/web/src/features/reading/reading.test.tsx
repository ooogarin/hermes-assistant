import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { ReadingList } from '../../components/reading/reading-list';
import { ReadingWorkspace } from '../../components/reading/reading-workspace';
import {
  getReadingMaterial,
  getReadingMaterials,
  markReadingMaterial,
  saveReadingAnswers,
  updateReadingSettings,
} from './reading-api';

const material = {
  code: 'RD-20261001-001',
  title: 'A morning market',
  content_text: 'Mira visits the market early every Sunday morning.',
  level: 'A1',
  genre: 'story',
  tags: ['daily-life'],
  target_word_count: 300,
  target_question_count: 1,
  reading_status: 'unread',
  created_at: '2026-10-01T10:00:00.000Z',
  updated_at: '2026-10-01T10:00:00.000Z',
  word_count: 9,
  is_override: false,
  source: 'request',
  questions: [{ question_number: 1, question_text: 'Who visits the market?', user_answer: null }],
};

const mockResponse = (data: unknown) => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockImplementation(
      async () =>
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
      <ReadingWorkspace
        material={parsed}
        onSubmit={async () => {}}
        onMark={() => {}}
        marking={false}
        submitting={false}
      />
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
        content_excerpt: material.content_text,
        tags: material.tags,
        reading_status: 'unread',
        created_at: '2026-10-01T10:00:00.000Z',
      },
    ],
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

test('keeps questions collapsed and permits saving a subset without marking read', async () => {
  const user = userEvent.setup();
  mockResponse({
    ...material,
    target_question_count: 3,
    questions: [
      ...material.questions,
      { question_number: 2, question_text: 'When does Mira visit?', user_answer: null },
      { question_number: 3, question_text: 'Where does she go?', user_answer: null },
    ],
  });
  const parsed = await getReadingMaterial(material.code);
  const save = vi.fn().mockResolvedValue(undefined);
  const mark = vi.fn();
  render(
    <MemoryRouter>
      <ReadingWorkspace material={parsed} onSubmit={save} onMark={mark} marking={false} submitting={false} />
    </MemoryRouter>,
  );
  expect(screen.getByText('Pertanyaan opsional').closest('details')).not.toHaveAttribute('open');
  await user.click(screen.getByText('Pertanyaan opsional'));
  await user.type(screen.getByLabelText('1. Who visits the market?'), 'Mira');
  await user.click(screen.getByRole('button', { name: 'Simpan jawaban' }));
  expect(save).toHaveBeenCalledWith([{ questionNumber: 1, userAnswer: 'Mira' }]);
  expect(mark).not.toHaveBeenCalled();
  expect(screen.getByLabelText('2. When does Mira visit?')).toBeEnabled();
});

test('omits the question section for a reading-only material', async () => {
  mockResponse({ ...material, target_question_count: 0, questions: [] });
  const parsed = await getReadingMaterial(material.code);
  const mark = vi.fn();
  render(
    <MemoryRouter>
      <ReadingWorkspace material={parsed} onSubmit={async () => {}} onMark={mark} marking={false} submitting={false} />
    </MemoryRouter>,
  );
  expect(screen.queryByText('Pertanyaan opsional')).not.toBeInTheDocument();
  await userEvent.setup().click(screen.getByRole('button', { name: 'Tandai sudah dibaca' }));
  expect(mark).toHaveBeenCalledOnce();
});

test('sends partial answer clears and manual read marks as independent snake_case PATCH requests', async () => {
  mockResponse(material);
  await saveReadingAnswers(material.code, [{ questionNumber: 1, userAnswer: null }]);
  expect(fetch).toHaveBeenLastCalledWith(
    `/api/v1/reading/materials/${material.code}/answers`,
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ answers: [{ question_number: 1, user_answer: null }] }),
    }),
  );
  await markReadingMaterial(material.code, 'read');
  expect(fetch).toHaveBeenLastCalledWith(
    `/api/v1/reading/materials/${material.code}`,
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ reading_status: 'read' }),
    }),
  );
});

test('sends a zero question default in the settings API contract', async () => {
  mockResponse({
    default_level: 'A1',
    default_word_count: 300,
    min_word_count: 250,
    max_word_count: 350,
    default_question_count: 0,
    updated_at: material.updated_at,
  });
  const result = await updateReadingSettings({
    defaultLevel: 'A1',
    defaultWordCount: 300,
    minWordCount: 250,
    maxWordCount: 350,
    defaultQuestionCount: 0,
  });
  expect(result.defaultQuestionCount).toBe(0);
  const [, options] = vi.mocked(fetch).mock.calls[0];
  expect(JSON.parse(String(options?.body))).toEqual({
    default_level: 'A1',
    default_word_count: 300,
    min_word_count: 250,
    max_word_count: 350,
    default_question_count: 0,
  });
});
