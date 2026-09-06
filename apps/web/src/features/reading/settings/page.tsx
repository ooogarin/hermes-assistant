import { LearningSettingsPage } from '../../../components/english/learning-settings';
import { getReadingSettings, updateReadingSettings } from '../reading-api';

const ReadingSettingsPage = () => (
  <LearningSettingsPage
    feature='Reading'
    getSettings={getReadingSettings}
    lengthLabel='Panjang bacaan'
    updateSettings={updateReadingSettings}
  />
);

export default ReadingSettingsPage;
