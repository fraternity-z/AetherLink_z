/**
 * 🎨 React Native Elements 主题配置
 *
 * 与应用的 React Native Paper 主题保持一致
 */

import { useTheme } from 'react-native-paper';
import { Theme as RNETheme } from '@rneui/themed';

export function useRNETheme(): RNETheme {
  const paperTheme = useTheme();

  return {
    colors: {
      primary: paperTheme.colors.primary,
      secondary: paperTheme.colors.secondary,
      background: paperTheme.colors.background,
      surface: paperTheme.colors.surface,
      grey0: paperTheme.dark ? '#1a1a1a' : '#ffffff',
      grey1: paperTheme.dark ? '#2a2a2a' : '#f8f9fa',
      grey2: paperTheme.dark ? '#3a3a3a' : '#e9ecef',
      grey3: paperTheme.dark ? '#4a4a4a' : '#dee2e6',
      grey4: paperTheme.dark ? '#5a5a5a' : '#ced4da',
      grey5: paperTheme.dark ? '#6a6a6a' : '#adb5bd',
      greyOutline: paperTheme.colors.outline,
      divider: paperTheme.dark ? '#2a2a2a' : '#e5e7eb',
      white: '#ffffff',
      black: '#000000',
      error: paperTheme.colors.error,
      warning: paperTheme.colors.error,
      success: '#22c55e',
    },
    mode: paperTheme.dark ? 'dark' : 'light',
    components: {
      Button: {
        titleStyle: {
          fontSize: 16,
          fontWeight: '600',
        },
        buttonStyle: {
          borderRadius: 12,
          paddingVertical: 12,
        },
        raised: true,
      },
      Card: {
        containerStyle: {
          borderRadius: 16,
          shadowColor: paperTheme.dark ? '#000' : '#7f1d1d',
          shadowOffset: {
            width: 0,
            height: paperTheme.dark ? 2 : 4,
          },
          shadowOpacity: paperTheme.dark ? 0.3 : 0.1,
          shadowRadius: paperTheme.dark ? 4 : 8,
          elevation: paperTheme.dark ? 3 : 5,
        },
      },
      ListItem: {
        containerStyle: {
          borderRadius: 12,
          marginHorizontal: 0,
          marginVertical: 2,
          backgroundColor: paperTheme.colors.surface,
        },
        titleStyle: {
          fontSize: 16,
          fontWeight: '500',
          color: paperTheme.colors.onSurface,
        },
        subtitleStyle: {
          fontSize: 14,
          color: paperTheme.colors.onSurfaceVariant,
        },
        chevron: {
          color: paperTheme.colors.onSurfaceVariant,
          size: 24,
        },
      },
      Avatar: {
        containerStyle: {
          backgroundColor: paperTheme.colors.primaryContainer,
        },
        titleStyle: {
          color: paperTheme.colors.onPrimaryContainer,
          fontSize: 18,
          fontWeight: '600',
        },
      },
      Icon: {
        color: paperTheme.colors.primary,
        size: 24,
      },
      Input: {
        containerStyle: {
          borderRadius: 12,
          paddingHorizontal: 16,
          backgroundColor: paperTheme.colors.surfaceVariant,
          borderWidth: 1,
          borderColor: paperTheme.colors.outline,
        },
        inputContainerStyle: {
          borderBottomWidth: 0,
        },
        inputStyle: {
          fontSize: 16,
          color: paperTheme.colors.onSurface,
        },
        placeholderTextColor: paperTheme.colors.onSurfaceVariant,
      },
      Dialog: {
        overlayStyle: {
          backgroundColor: paperTheme.dark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)',
        },
        dialogStyle: {
          borderRadius: 20,
          backgroundColor: paperTheme.colors.surface,
          padding: 0,
        },
        titleStyle: {
          fontSize: 20,
          fontWeight: '700',
          color: paperTheme.colors.onSurface,
          textAlign: 'center',
          paddingTop: 20,
        },
      },
      BottomSheet: {
        containerStyle: {
          backgroundColor: paperTheme.colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
        },
      },
      SocialIcon: {
        iconStyle: {
          backgroundColor: paperTheme.colors.primaryContainer,
          borderRadius: 12,
        },
      },
      SearchBar: {
        containerStyle: {
          backgroundColor: paperTheme.colors.surfaceVariant,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: paperTheme.colors.outline,
        },
        inputContainerStyle: {
          backgroundColor: 'transparent',
        },
        inputStyle: {
          color: paperTheme.colors.onSurface,
        },
      },
      Text: {
        style: {
          color: paperTheme.colors.onSurface,
        },
        h1Style: {
          fontSize: 32,
          fontWeight: '700',
          color: paperTheme.colors.onSurface,
        },
        h2Style: {
          fontSize: 28,
          fontWeight: '600',
          color: paperTheme.colors.onSurface,
        },
        h3Style: {
          fontSize: 24,
          fontWeight: '600',
          color: paperTheme.colors.onSurface,
        },
        h4Style: {
          fontSize: 20,
          fontWeight: '500',
          color: paperTheme.colors.onSurface,
        },
      },
    },
  };
}