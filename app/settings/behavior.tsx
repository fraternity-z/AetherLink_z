import React, { useState } from 'react';
import { List, Switch, TextInput } from 'react-native-paper';
import { SettingScreen } from '@/components/settings/SettingScreen';

export default function BehaviorSettings() {
  const [sendOnEnter, setSendOnEnter] = useState(true);
  const [showTyping, setShowTyping] = useState(true);
  const [notify, setNotify] = useState(false);

  return (
    <SettingScreen title="行为" description="消息发送、输入框与通知相关设置">
      <List.Section>
        <List.Item title="回车发送" right={() => <Switch value={sendOnEnter} onValueChange={setSendOnEnter} />} />
        <List.Item title="显示输入指示" right={() => <Switch value={showTyping} onValueChange={setShowTyping} />} />
        <List.Item title="通知推送" right={() => <Switch value={notify} onValueChange={setNotify} />} />
      </List.Section>
    </SettingScreen>
  );
}

