import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import '../global.css';
import HiddenWebViewHost from '@/components/providers/HiddenWebViewHost'
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppThemeProvider } from '@/components/providers/ThemeProvider';
import { SettingsProvider, useAppSettings } from '@/components/providers/SettingsProvider';
import { AppDataProvider } from '@/components/providers/DataProvider';
import { ConfirmDialogProvider } from '@/hooks/use-confirm-dialog';
import { DarkTheme as NavDarkTheme, DefaultTheme as NavDefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';


function RootLayoutInner() {
  const system = useColorScheme();
  const { themeMode } = useAppSettings();
  const scheme = themeMode === 'system' ? system : themeMode;
  const navTheme = scheme === 'dark' ? NavDarkTheme : NavDefaultTheme;
  return (
      <NavThemeProvider value={navTheme}>
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
      </NavThemeProvider>
    
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AppThemeProvider>
        <AppDataProvider>
          <ConfirmDialogProvider>
            <HiddenWebViewHost />
            <RootLayoutInner />
          </ConfirmDialogProvider>
        </AppDataProvider>
        </AppThemeProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
// 忽略第三方依赖内部仍使用 RN SafeAreaView 的开发期警告
LogBox.ignoreLogs([
  'SafeAreaView has been deprecated and will be removed',
]);
