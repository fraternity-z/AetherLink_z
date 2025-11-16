/**
 * 全局错误边界组件
 *
 * 捕获 React 组件树中的未捕获错误，提供降级 UI 和错误恢复功能
 *
 * @example
 * ```tsx
 * <ErrorBoundary fallback={<CustomErrorView />}>
 *   <App />
 * </ErrorBoundary>
 * ```
 */

import React, { Component, type ReactNode } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Surface, useTheme, Icon } from 'react-native-paper';
import { AppError, normalizeError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { router } from 'expo-router';

/**
 * ErrorBoundary 组件属性
 */
export interface ErrorBoundaryProps {
  /** 子组件 */
  children: ReactNode;
  /** 自定义降级 UI（可选） */
  fallback?: ReactNode | ((error: AppError, retry: () => void) => ReactNode);
  /** 错误级别（root | page | module），用于决定降级策略 */
  level?: 'root' | 'page' | 'module';
  /** 错误回调（可选，用于自定义错误处理） */
  onError?: (error: AppError, errorInfo: React.ErrorInfo) => void;
  /** 重置回调（可选，用于清理状态） */
  onReset?: () => void;
}

/**
 * ErrorBoundary 组件状态
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
}

/**
 * 默认错误降级 UI 组件
 */
function DefaultErrorFallback({
  error,
  retry,
  level,
}: {
  error: AppError;
  retry: () => void;
  level: 'root' | 'page' | 'module';
}) {
  const theme = useTheme();

  const getSeverityColor = () => {
    switch (error.severity) {
      case 'critical':
        return theme.colors.error;
      case 'high':
        return theme.colors.errorContainer;
      case 'medium':
        return theme.colors.tertiary;
      default:
        return theme.colors.surfaceVariant;
    }
  };

  const getIcon = () => {
    if (level === 'root') return 'alert-octagon';
    if (level === 'page') return 'alert-circle';
    return 'alert';
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Surface style={[styles.errorCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 错误图标 */}
          <View style={[styles.iconContainer, { backgroundColor: getSeverityColor() }]}>
            <Icon source={getIcon()} size={48} color={theme.colors.onError} />
          </View>

          {/* 错误标题 */}
          <Text variant="headlineSmall" style={styles.title}>
            {level === 'root' ? '应用遇到问题' : '页面加载失败'}
          </Text>

          {/* 用户友好的错误消息 */}
          <Text variant="bodyLarge" style={[styles.message, { color: theme.colors.onSurface }]}>
            {error.getUserMessage()}
          </Text>

          {/* 错误详情（可展开） */}
          <Surface style={[styles.detailsCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              错误详情
            </Text>
            <Text variant="bodySmall" style={[styles.detailsText, { color: theme.colors.onSurfaceVariant }]}>
              错误码: {error.code}
            </Text>
            <Text variant="bodySmall" style={[styles.detailsText, { color: theme.colors.onSurfaceVariant }]}>
              严重级别: {error.severity}
            </Text>
            {error.message && (
              <Text variant="bodySmall" style={[styles.detailsText, { color: theme.colors.onSurfaceVariant }]}>
                技术消息: {error.message}
              </Text>
            )}
          </Surface>

          {/* 错误恢复建议 */}
          {error.getRecoveryActions().length > 0 && (
            <View style={styles.actionsContainer}>
              <Text variant="labelMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
                建议操作
              </Text>
              {error.getRecoveryActions().map((action, index) => (
                <View key={index} style={styles.actionItem}>
                  <Icon source="chevron-right" size={16} color={theme.colors.primary} />
                  <Text variant="bodyMedium" style={[styles.actionText, { color: theme.colors.onSurface }]}>
                    {action.title}: {action.description}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* 操作按钮 */}
          <View style={styles.buttonsContainer}>
            {error.retryable && (
              <Button
                mode="contained"
                onPress={retry}
                icon="refresh"
                style={styles.button}
              >
                重试
              </Button>
            )}
            {level === 'page' && (
              <Button
                mode="outlined"
                onPress={() => router.back()}
                icon="arrow-left"
                style={styles.button}
              >
                返回
              </Button>
            )}
            {level === 'root' && (
              <Button
                mode="outlined"
                onPress={() => router.replace('/')}
                icon="home"
                style={styles.button}
              >
                回到首页
              </Button>
            )}
          </View>
        </ScrollView>
      </Surface>
    </View>
  );
}

/**
 * 全局错误边界组件
 *
 * 使用 Class Component 实现，因为 Error Boundary 必须使用 componentDidCatch
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  /**
   * 捕获错误时的生命周期方法
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 将原始错误转换为 AppError
    const appError = normalizeError(error);

    return {
      hasError: true,
      error: appError,
    };
  }

  /**
   * 捕获错误后的处理
   */
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const appError = normalizeError(error);
    const { level = 'module', onError } = this.props;

    // 记录错误日志
    logger.error(
      `[ErrorBoundary-${level}] 捕获到未处理的错误`,
      {
        ...appError.getContext(),
        componentStack: errorInfo.componentStack,
      },
      appError
    );

    // 调用自定义错误处理回调
    if (onError) {
      onError(appError, errorInfo);
    }

    // TODO: 集成错误上报服务（如 Sentry）
    // errorReporter.captureException(appError, {
    //   level,
    //   componentStack: errorInfo.componentStack,
    // });
  }

  /**
   * 重置错误状态
   */
  resetError = () => {
    const { onReset } = this.props;

    this.setState({
      hasError: false,
      error: null,
    });

    // 调用重置回调
    if (onReset) {
      onReset();
    }
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback, level = 'module' } = this.props;

    if (hasError && error) {
      // 如果提供了自定义降级 UI
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(error, this.resetError);
        }
        return fallback;
      }

      // 使用默认降级 UI
      return <DefaultErrorFallback error={error} retry={this.resetError} level={level} />;
    }

    return children;
  }
}

/**
 * 样式定义
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorCard: {
    width: '100%',
    maxWidth: 600,
    borderRadius: 16,
    padding: 24,
  },
  scrollContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  detailsCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  detailsText: {
    marginTop: 8,
    lineHeight: 20,
  },
  actionsContainer: {
    width: '100%',
    marginBottom: 24,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  actionText: {
    flex: 1,
    marginLeft: 8,
    lineHeight: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  button: {
    minWidth: 120,
  },
});
