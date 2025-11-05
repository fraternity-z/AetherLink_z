import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import { useTheme, Text } from 'react-native-paper';

interface SettingScreenProps {
  title: string;
  children: React.ReactNode;
  description?: string;
}

export function SettingScreen({ title, children, description }: SettingScreenProps) {
  const theme = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Stack.Screen options={{ title }} />
      {description ? (
        <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {description}
          </Text>
        </View>
      ) : null}
      <ScrollView contentContainerStyle={styles.container}>
        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  container: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});

