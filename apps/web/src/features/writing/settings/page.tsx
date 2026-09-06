import { LearningSettingsPage } from '../../../components/english/learning-settings';
import { getWritingSettings, updateWritingSettings } from '../writing-api';

const WritingSettingsPage = () => (
  <LearningSettingsPage
    feature='Writing'
    getSettings={getWritingSettings}
    lengthLabel='Panjang tulisan'
    updateSettings={updateWritingSettings}
  />
);

export default WritingSettingsPage;
