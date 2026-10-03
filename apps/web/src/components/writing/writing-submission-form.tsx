import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateWritingSubmission } from '../../features/writing/writing-api';
import { countWritingWords } from '../../features/writing/writing-display';
import { ApiError } from '../../lib/api/api-error';
import { useUnsavedChanges } from '../../lib/hooks/use-unsaved-changes';
import { Button } from '../ui/button';
import { ChoiceDropdown } from '../ui/choice-dropdown';
import { CopyButton } from '../ui/copy-button';
import { Field, TextAreaField, TextField } from '../ui/form-field';
import { TagInput } from '../ui/tag-input';
import type { FormEvent } from 'react';
import type { UpdateWritingSubmissionInput, WritingSubmission } from '../../features/writing/writing-api';

const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

export const WritingSubmissionForm = ({ submission }: { submission: WritingSubmission }) => {
  const navigate = useNavigate();
  const [text, setText] = useState(submission.originalText);
  const [topic, setTopic] = useState(submission.estimatedTopic ?? '');
  const [genre, setGenre] = useState(submission.estimatedGenre ?? '');
  const [level, setLevel] = useState(submission.estimatedLevel ?? '');
  const [tags, setTags] = useState(submission.estimatedTags);
  const [textLocked, setTextLocked] = useState(submission.analysis !== null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const textChanged = text !== submission.originalText;
  const topicChanged = topic.trim() !== (submission.estimatedTopic ?? '');
  const genreChanged = genre.trim() !== (submission.estimatedGenre ?? '');
  const levelChanged = level !== (submission.estimatedLevel ?? '');
  const tagsChanged = JSON.stringify(tags) !== JSON.stringify(submission.estimatedTags);
  const dirty = textChanged || topicChanged || genreChanged || levelChanged || tagsChanged;
  const hasEditableChanges =
    (!textLocked && textChanged) || topicChanged || genreChanged || levelChanged || tagsChanged;
  const validText = textLocked || (/\S/.test(text) && text.length <= 100_000);
  const validMetadata =
    (!topicChanged || topic.trim().length > 0) &&
    (!genreChanged || genre.trim().length > 0) &&
    (!levelChanged || levels.includes(level));
  const valid = validText && validMetadata;
  const canLeave = useUnsavedChanges(dirty);

  const save = async (event: FormEvent) => {
    event.preventDefault();

    if (!hasEditableChanges || !valid || saving) {
      return;
    }

    const input: UpdateWritingSubmissionInput = {};

    if (!textLocked && textChanged) {
      input.originalText = text;
    }

    if (topicChanged) {
      input.estimatedTopic = topic.trim();
    }

    if (genreChanged) {
      input.estimatedGenre = genre.trim();
    }

    if (levelChanged) {
      input.estimatedLevel = level;
    }

    if (tagsChanged && tags !== null) {
      input.estimatedTags = tags;
    }

    setSaving(true);
    setError(undefined);

    try {
      await updateWritingSubmission(submission.code, input);
      navigate(`/english/writing/submissions/${submission.code}`, {
        replace: true,
        state: { notice: 'Tulisan berhasil diperbarui.' },
      });
    } catch (cause) {
      // Analysis may finish while this editor is open. Keep the draft visible when the API locks it.
      const locked = cause instanceof ApiError && cause.code === 'WRITING_SUBMISSION_TEXT_LOCKED';

      if (locked) {
        setTextLocked(true);
      }

      setError(
        locked
          ? 'Tulisan sudah dianalisis. Perubahan teks belum disimpan dan kini terkunci. Metadata tetap bisa diedit.'
          : 'Perubahan belum dapat disimpan. Coba lagi.',
      );
      setSaving(false);
    }
  };

  return (
    <form className='mt-7 space-y-6 rounded-surface border border-border bg-surface p-6 sm:p-8' onSubmit={save}>
      {textLocked ? (
        <section>
          <h2 className='text-base font-semibold text-ink'>Teks terkunci</h2>
          <p className='mt-2 text-sm text-ink-muted'>Teks tidak dapat diubah setelah dianalisis.</p>
          {textChanged ? (
            <div className='mt-4 space-y-3'>
              <TextAreaField className='min-h-64' label='Perubahan teks yang belum disimpan' readOnly value={text} />
              <div className='flex items-center gap-2 text-xs text-ink-muted'>
                <CopyButton label='Salin perubahan teks' value={text} />
                <span>Salin teks ini sebelum meninggalkan halaman.</span>
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <TextAreaField
          className='min-h-80'
          disabled={saving}
          helper={`${countWritingWords(text)} kata`}
          label='Tulisanmu'
          maxLength={100_000}
          onChange={(event) => setText(event.target.value)}
          required
          value={text}
        />
      )}
      <section className='space-y-5 border-t border-border pt-6'>
        <div>
          <h2 className='text-lg font-semibold text-ink'>Metadata estimasi</h2>
          <p className='mt-2 text-sm leading-6 text-ink-muted'>
            Kamu bisa mengisi atau mengoreksi estimasi. Perubahan ini tidak mengubah feedback.
          </p>
        </div>
        <div className='grid gap-5 sm:grid-cols-2'>
          <TextField
            disabled={saving}
            error={topicChanged && topic.trim() === '' ? 'Topik tidak bisa dikosongkan.' : undefined}
            label='Estimasi topik'
            maxLength={300}
            onChange={(event) => setTopic(event.target.value)}
            placeholder='Belum diestimasi'
            value={topic}
          />
          <TextField
            disabled={saving}
            error={genreChanged && genre.trim() === '' ? 'Genre tidak bisa dikosongkan.' : undefined}
            label='Estimasi genre'
            maxLength={100}
            onChange={(event) => setGenre(event.target.value)}
            placeholder='Belum diestimasi'
            value={genre}
          />
          <Field label='Estimasi level'>
            <ChoiceDropdown
              clearable={submission.estimatedLevel === null}
              disabled={saving}
              label='Estimasi level'
              mode='single'
              onChange={(value) => setLevel(value ?? '')}
              options={levels.map((value) => ({ label: value, value }))}
              placeholder='Belum diestimasi'
              searchable={false}
              value={level || null}
            />
          </Field>
        </div>
        <TagInput disabled={saving} label='Estimasi tags' onChange={setTags} value={tags ?? []} />
      </section>
      {error === undefined ? null : (
        <p className='text-sm text-danger' role='alert'>
          {error}
        </p>
      )}
      <div className='flex flex-wrap gap-3'>
        <Button disabled={!hasEditableChanges || !valid} pending={saving} pendingLabel='Menyimpan…' type='submit'>
          Simpan perubahan
        </Button>
        <Button
          disabled={saving}
          onClick={() => {
            if (canLeave()) {
              navigate(`/english/writing/submissions/${submission.code}`);
            }
          }}
          variant='secondary'
        >
          Batal
        </Button>
      </div>
    </form>
  );
};
