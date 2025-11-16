/**
 * 🔍 MathJax 渲染诊断工具
 *
 * 用于调试数学公式渲染问题，输出详细的诊断信息
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, useTheme, Surface, Divider } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import mathJaxBundle from '@/assets/mathjax/tex-mml-chtml.jsbundle';
import { logger } from '@/utils/logger';

const mathJaxAsset = Asset.fromModule(mathJaxBundle);

/**
 * 简化的 MathJax HTML 模板（用于测试）
 */
const TEST_TEMPLATE = (mathJaxSrc: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: Arial, sans-serif;
      background-color: #f0f0f0;
    }
    .status {
      padding: 10px;
      margin: 10px 0;
      border-radius: 5px;
      background-color: #fff;
    }
    .success { border-left: 4px solid #4caf50; }
    .error { border-left: 4px solid #f44336; }
    .info { border-left: 4px solid #2196f3; }
  </style>
  <script>
    function sendMessage(type, data) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...data }));
      } else {
        console.error('ReactNativeWebView not available');
      }
    }

    // 1. 测试基础功能
    sendMessage('log', { message: '✅ WebView JavaScript 已加载' });

    // 2. 配置 MathJax
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$']],
        displayMath: [['$$', '$$']]
      },
      startup: {
        ready: () => {
          sendMessage('log', { message: '✅ MathJax startup.ready 被调用' });
          MathJax.startup.defaultReady();
          MathJax.startup.promise.then(() => {
            sendMessage('log', { message: '✅ MathJax 初始化完成' });
            testRender();
          }).catch(err => {
            sendMessage('error', { message: 'MathJax 初始化失败: ' + err.message });
          });
        }
      }
    };

    // 3. 加载 MathJax
    sendMessage('log', { message: '🔄 开始加载 MathJax: ' + '${mathJaxSrc}' });
  </script>
  <script src="${mathJaxSrc}" onerror="sendMessage('error', { message: 'MathJax 脚本加载失败' })"></script>
  <script>
    function testRender() {
      const container = document.createElement('div');
      container.innerHTML = '<p>测试行内公式: $E=mc^2$</p><p>测试块级公式:</p>$$\\\\int_{-\\\\infty}^{\\\\infty} e^{-x^2} dx = \\\\sqrt{\\\\pi}$$';
      document.body.appendChild(container);

      sendMessage('log', { message: '🔄 开始渲染测试公式' });

      if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([container]).then(() => {
          sendMessage('log', { message: '✅ 公式渲染成功' });
          sendMessage('success', { message: '所有测试通过！' });
        }).catch(err => {
          sendMessage('error', { message: '公式渲染失败: ' + err.message });
        });
      } else {
        sendMessage('error', { message: 'MathJax.typesetPromise 不可用' });
      }
    }
  </script>
</head>
<body>
  <div class="status info">
    <strong>MathJax 诊断测试</strong><br/>
    正在执行测试流程...
  </div>
</body>
</html>
`;

export function MathJaxDebugger() {
  const theme = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [logs, setLogs] = useState<Array<{ type: string; message: string; timestamp: string }>>([]);
  const [mathJaxUri, setMathJaxUri] = useState<string | null>(null);
  const [assetInfo, setAssetInfo] = useState<string>('');

  // 加载 MathJax 资源
  const loadAsset = useCallback(async () => {
    const startTime = Date.now();
    addLog('info', '🔄 开始加载 MathJax 资源...');

    try {
      // 检查资源状态
      addLog('info', `Asset downloaded: ${mathJaxAsset.downloaded}`);
      addLog('info', `Asset localUri: ${mathJaxAsset.localUri}`);
      addLog('info', `Asset uri: ${mathJaxAsset.uri}`);

      if (!mathJaxAsset.downloaded) {
        addLog('info', '⏬ 资源未下载，开始下载...');
        await mathJaxAsset.downloadAsync();
        addLog('success', '✅ 资源下载完成');
      }

      const uri = mathJaxAsset.localUri ?? mathJaxAsset.uri;
      if (!uri) {
        throw new Error('无法获取资源 URI');
      }

      const elapsed = Date.now() - startTime;
      addLog('success', `✅ MathJax 资源加载成功 (${elapsed}ms)`);
      addLog('info', `使用 URI: ${uri}`);

      setMathJaxUri(uri);
      setAssetInfo(`
Downloaded: ${mathJaxAsset.downloaded}
Local URI: ${mathJaxAsset.localUri}
URI: ${mathJaxAsset.uri}
Final URI: ${uri}
      `.trim());
    } catch (error: any) {
      logger.error('加载 MathJax 资源失败:', error);
      addLog('error', `❌ 加载失败: ${error.message}`);
    }
  }, []);

  // 添加日志
  const addLog = useCallback((type: string, message: string) => {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    setLogs(prev => [...prev, { type, message, timestamp }]);
    logger.debug(`[MathJax诊断] [${type}] ${message}`);
  }, []);

  // 处理 WebView 消息
  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      switch (data.type) {
        case 'log':
          addLog('info', data.message);
          break;
        case 'error':
          addLog('error', data.message);
          break;
        case 'success':
          addLog('success', data.message);
          break;
        default:
          addLog('info', `未知消息类型: ${data.type}`);
      }
    } catch (error: any) {
      addLog('error', `解析 WebView 消息失败: ${error.message}`);
    }
  }, [addLog]);

  // 清空日志
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // 重新测试
  const retest = useCallback(() => {
    clearLogs();
    setMathJaxUri(null);
    loadAsset();
  }, [clearLogs, loadAsset]);

  // 组件挂载时自动开始测试
  React.useEffect(() => {
    loadAsset();
  }, [loadAsset]);

  // 生成 HTML 内容
  const htmlContent = React.useMemo(() => {
    if (!mathJaxUri) {
      return '<!DOCTYPE html><html><body>等待加载...</body></html>';
    }
    return TEST_TEMPLATE(mathJaxUri);
  }, [mathJaxUri]);

  // 日志颜色
  const getLogColor = (type: string) => {
    switch (type) {
      case 'error': return theme.colors.error;
      case 'success': return '#4caf50';
      case 'info': return theme.colors.primary;
      default: return theme.colors.onSurface;
    }
  };

  return (
    <View style={styles.container}>
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
          🔍 MathJax 渲染诊断工具
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 12 }}>
          此工具用于诊断数学公式渲染问题，查看详细的加载和渲染日志
        </Text>

        <View style={styles.buttonRow}>
          <Button mode="outlined" onPress={retest} style={{ marginRight: 8 }}>
            重新测试
          </Button>
          <Button mode="outlined" onPress={clearLogs}>
            清空日志
          </Button>
        </View>
      </Surface>

      <Divider />

      {/* 资源信息 */}
      {assetInfo && (
        <Surface style={[styles.section, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurface, marginBottom: 4 }}>
            📦 资源信息
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontFamily: 'monospace' }}>
            {assetInfo}
          </Text>
        </Surface>
      )}

      {/* 日志列表 */}
      <ScrollView style={styles.logContainer}>
        <Surface style={[styles.section, { backgroundColor: theme.colors.surface }]} elevation={0}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
            📋 诊断日志 ({logs.length})
          </Text>

          {logs.length === 0 ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, fontStyle: 'italic' }}>
              暂无日志
            </Text>
          ) : (
            logs.map((log, index) => (
              <View key={index} style={styles.logItem}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginRight: 8 }}>
                  {log.timestamp}
                </Text>
                <Text variant="bodySmall" style={{ color: getLogColor(log.type), flex: 1 }}>
                  {log.message}
                </Text>
              </View>
            ))
          )}
        </Surface>
      </ScrollView>

      {/* 测试 WebView */}
      {mathJaxUri && (
        <View style={styles.webViewContainer}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurface, marginBottom: 8 }}>
            🖼️ WebView 渲染预览
          </Text>
          <WebView
            ref={webViewRef}
            source={{ html: htmlContent }}
            style={styles.webView}
            onMessage={handleMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            originWhitelist={['*']}
            mixedContentMode="compatibility"
            onError={(syntheticEvent) => {
              const { nativeEvent } = syntheticEvent;
              addLog('error', `WebView 错误: ${nativeEvent.description}`);
            }}
            onLoad={() => {
              addLog('success', '✅ WebView 加载完成');
            }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  buttonRow: {
    flexDirection: 'row',
  },
  section: {
    padding: 12,
    margin: 8,
    borderRadius: 8,
  },
  logContainer: {
    flex: 1,
  },
  logItem: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  webViewContainer: {
    padding: 12,
    height: 300,
  },
  webView: {
    flex: 1,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
});
