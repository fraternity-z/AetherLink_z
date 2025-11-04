import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text, IconButton, useTheme } from 'react-native-paper';
import type { SearchEngine } from '@/services/search/types';

interface SearchLoadingIndicatorProps {
  engine: SearchEngine;
  query: string;
  onCancel?: () => void;
}

/**
 * 搜索加载指示器组件
 *
 * 显示搜索进度和状态信息
 */
export function SearchLoadingIndicator({ engine, query, onCancel }: SearchLoadingIndicatorProps) {
  const theme = useTheme();

  // 获取搜索引擎显示名称
  const getEngineName = (eng: SearchEngine): string => {
    switch (eng) {
      case 'bing':
        return 'Bing';
      case 'google':
        return 'Google';
      case 'tavily':
        return 'Tavily';
      default:
        return '未知引擎';
    }
  };

  // 获取搜索引擎图标
  const getEngineIcon = (eng: SearchEngine): string => {
    switch (eng) {
      case 'bing':
        return 'microsoft-bing';
      case 'google':
        return 'google';
      case 'tavily':
        return 'cloud-search';
      default:
        return 'web';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}>
      <View style={styles.content}>
        {/* 搜索引擎图标和加载动画 */}
        <View style={styles.iconContainer}>
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={styles.spinner}
          />
        </View>

        {/* 搜索状态文本 */}
        <View style={styles.textContainer}>
          <Text style={[styles.engineText, { color: theme.colors.primary }]}>
            正在使用 {getEngineName(engine)} 搜索
          </Text>
          <Text
            style={[styles.queryText, { color: theme.colors.onSurfaceVariant }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            查询: {query}
          </Text>
        </View>

        {/* 取消按钮 */}
        {onCancel && (
          <IconButton
            icon="close"
            size={20}
            onPress={onCancel}
            iconColor={theme.colors.onSurfaceVariant}
            style={styles.cancelButton}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 12,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: 12,
  },
  spinner: {
    width: 24,
    height: 24,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  engineText: {
    fontSize: 14,
    fontWeight: '600',
  },
  queryText: {
    fontSize: 12,
    fontWeight: '400',
  },
  cancelButton: {
    margin: 0,
  },
});
