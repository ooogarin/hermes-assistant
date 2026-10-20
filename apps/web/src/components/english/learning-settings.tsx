import { useApiQuery } from '../../lib/hooks/use-api-query';
import { ErrorState } from '../feedback/content-state';
import { Skeleton } from '../feedback/skeleton';
import { LearningSettingsForm } from './learning-settings-form';

export type LearningSettings = {
  defaultLevel: string;
  defaultWordCount: number;
  defaultQuestionCount?: number;
  maxWordCount: number;
  minWordCount: number;
  updatedAt: string;
};

export type LearningSettingsInput = Pick<
  LearningSettings,
  'defaultLevel' | 'defaultWordCount' | 'minWordCount' | 'maxWordCount' | 'defaultQuestionCount'
>;

export type LearningSettingsPageProps = {
  feature: 'Reading' | 'Writing';
  getSettings: (signal?: AbortSignal) => Promise<LearningSettings>;
  lengthLabel: string;
  updateSettings: (input: LearningSettingsInput) => Promise<LearningSettings>;
};

const LoadingState = () => (
  <div className='grid gap-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.8fr)]'>
    <div className='space-y-8'>
      <Skeleton className='h-8 w-52' />
      <Skeleton className='h-20 w-full' />
      <Skeleton className='h-px w-full' />
      <Skeleton className='h-8 w-48' />
      <Skeleton className='h-20 w-full' />
    </div>
    <div className='space-y-5 border-l border-border pl-8'>
      <Skeleton className='h-8 w-44' />
      <Skeleton className='h-14 w-full' />
      <Skeleton className='h-14 w-full' />
      <Skeleton className='h-14 w-full' />
    </div>
  </div>
);

export const LearningSettingsPage = (props: LearningSettingsPageProps) => {
  const settings = useApiQuery(`${props.feature.toLowerCase()}-settings`, props.getSettings);
  if (settings.status === 'loading') return <LoadingState />;
  if (settings.status === 'error') return <ErrorState onRetry={settings.retry} />;
  return <LearningSettingsForm {...props} initial={settings.data} />;
};
