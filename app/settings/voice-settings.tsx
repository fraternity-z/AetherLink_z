import React, { useState } from 'react';
import { List, Switch, TextInput } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';

export default function VoiceSettings() {
  const [stt, setStt] = useState(false);
  const [tts, setTts] = useState(false);
  const [voice, setVoice] = useState('default');
  return (
    <SettingScreen title="语音功能" description="语音识别和文本转语音设置（占位）">
      <List.Section>
        <List.Item title="启用语音识别" right={() => <Switch value={stt} onValueChange={setStt} />} />
        <List.Item title="启用文本转语音" right={() => <Switch value={tts} onValueChange={setTts} />} />
        <TextInput label="语音包/声音" value={voice} onChangeText={setVoice} />
      </List.Section>
    </SettingScreen>
  );
}

