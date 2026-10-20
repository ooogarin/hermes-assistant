import { ArrowDown, ArrowUp, CircleGauge, List, Tag } from 'lucide-react';
import { SettingsSummary } from './settings-parts';
import type { LearningSettings } from './learning-settings';

export const LearningSettingsSummary = ({ settings }: { settings: LearningSettings }) => {
  const rows = [
    { icon: CircleGauge, label: 'Level default', value: settings.defaultLevel },
    { icon: List, label: 'Target (ideal)', value: `${settings.defaultWordCount} kata` },
    { icon: ArrowDown, label: 'Rentang minimum', value: `${settings.minWordCount} kata` },
    { icon: ArrowUp, label: 'Rentang maksimum', value: `${settings.maxWordCount} kata` },
    ...(settings.defaultQuestionCount === undefined
      ? []
      : [{ icon: List, label: 'Jumlah soal', value: `${settings.defaultQuestionCount} soal` }]),
    { icon: Tag, label: 'Genre & topik', value: 'Beragam secara otomatis' },
  ];

  return (
    <SettingsSummary
      note='Permintaan sekali, seperti topik atau level berbeda, tidak mengubah pengaturan default ini.'
      rows={rows}
    />
  );
};
