import React from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { SettingsList } from '@/components/settings/SettingsList';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function SettingsScreen() {
  return (
    <ErrorBoundary level="page">
      <View style={styles.container}>
        <Stack.Screen options={{ title: '设置' }} />
        <SettingsList />
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

