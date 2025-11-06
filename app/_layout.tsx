import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppThemeProvider } from '@/components/providers/ThemeProvider';
import { AppDataProvider } from '@/components/providers/DataProvider';
import { ConfirmDialogProvider } from '@/hooks/use-confirm-dialog';


function RootLayoutInner() {
  return (
    
      <ThemeProvider value={useColorScheme() === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
        {/* 根聊天页，无头部 */}
          <Stack.Screen name="index" options={{ headerShown: false }} />
        {/* 设置页（指向 app/settings/index.tsx） */}
          <Stack.Screen name="settings/index" options={{ title: '设置' }} />
        {/* 外观设置页 */}
          <Stack.Screen name="settings/appearance" />
        {/* 行为设置页 */}
        <Stack.Screen name="settings/behavior" />
        {/* 话题列表 */}
        <Stack.Screen name="topics/index" options={{ title: '话题列表' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AppThemeProvider>
      <AppDataProvider>
        <ConfirmDialogProvider>
          <RootLayoutInner />
        </ConfirmDialogProvider>
      </AppDataProvider>
    </AppThemeProvider>
  );
}
