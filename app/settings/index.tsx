import React from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { SettingsList } from '@/components/settings/SettingsList';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: '设置' }} />
      <SettingsList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

