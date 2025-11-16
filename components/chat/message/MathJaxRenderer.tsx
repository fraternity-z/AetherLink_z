/**
 * 🧮 MathJax 数学公式渲染组件
 *
 * 功能：
 * - 使用 WebView 渲染 LaTeX 数学公式
 * - 支持行内公式和块级公式
 * - 自动调整 WebView 高度
 * - 主题适配（明暗模式）
 * - 加载状态和错误处理
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { useTheme } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { Asset } from 'expo-asset';
import { mathJaxCache } from '@/utils/render-cache';
import { logger } from '@/utils/logger';
import mathJaxBundle from '@/assets/mathjax/tex-mml-chtml.jsbundle';

export interface MathFormula {
  id: string;
  formula: string;
  isInline: boolean;
}

export interface MathJaxRendererProps {
  formulas: MathFormula[];
  onComplete?: (heights: { [formulaId: string]: number }) => void;
  onError?: (error: string) => void;
}

const mathJaxAsset = Asset.fromModule(mathJaxBundle);

/**
 * MathJax HTML 模板
 */
const MATHJAX_TEMPLATE = (theme: 'light' | 'dark', baseFontPx: number, mathJaxSrc: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <script>
    // MathJax 配置
    window.MathJax = {
      tex: {
        inlineMath: [['$', '$'], ['\\(', '\\)']],
        displayMath: [['$$', '$$'], ['\\[', '\\]']],
        processEscapes: true,
        processEnvironments: true
      },
      startup: {
        ready: () => {
          MathJax.startup.defaultReady();
          MathJax.startup.promise.then(() => {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'ready'
            }));
          });
        }
      },
      options: {
        skipHtmlTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
        ignoreHtmlClass: 'tex2jax_ignore',
        processHtmlClass: 'tex2jax_process'
      }
    };
  </script>
  <script src="${mathJaxSrc}"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: ${theme === 'dark' ? '#1e1e1e' : '#ffffff'};
      color: ${theme === 'dark' ? '#ffffff' : '#000000'};
      font-size: ${baseFontPx}px;
      line-height: 1.5;
      overflow-x: hidden;
    }

    .formula-container {
      padding: 8px 0;
      width: 100%;
      box-sizing: border-box;
    }

    .inline-formula {
      display: inline;
    }

    .block-formula {
      display: block;
      text-align: center;
      margin: 12px 0;
    }

    /* MathJax 样式覆盖 */
    mjx-container {
      font-size: 1em !important;
    }

    mjx-container[jax="CHTML"] {
      text-align: left !important;
    }

    mjx-container[jax="CHTML"][display="true"] {
      text-align: center !important;
      margin: 1em 0 !important;
    }

    /* 隐藏滚动条 */
    ::-webkit-scrollbar {
      display: none;
    }

    html, body {
      overflow: hidden;
    }
  </style>
</head>
<body>
  <div id="root"></div>

  <script>
    let formulas = [];
    let processedFormulas = 0;

    // 接收公式数据
    window.setFormulas = function(formulaData) {
      formulas = formulaData;
      renderFormulas();
    };

    // 渲染公式
    function renderFormulas() {
      const root = document.getElementById('root');
      root.innerHTML = '';

      formulas.forEach((formula, index) => {
        const container = document.createElement('div');
        container.className = 'formula-container';

        const formulaDiv = document.createElement('div');
        formulaDiv.className = formula.isInline ? 'inline-formula' : 'block-formula';
        formulaDiv.id = 'formula-' + formula.id;

        // 设置公式内容
        if (formula.isInline) {
          formulaDiv.textContent = '$' + formula.formula + '$';
        } else {
          formulaDiv.textContent = '$$' + formula.formula + '$$';
        }

        container.appendChild(formulaDiv);
        root.appendChild(container);
      });

      // 触发 MathJax 重新渲染
      if (window.MathJax && window.MathJax.typesetPromise) {
        MathJax.typesetPromise([root]).then(() => {
          calculateHeights();
        }).catch((error) => {
          console.error('MathJax rendering error:', error);
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'error',
            error: 'MathJax rendering failed: ' + error.message
          }));
        });
      } else {
        console.error('MathJax not available');
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'error',
          error: 'MathJax not available'
        }));
      }
    }

    // 计算公式高度
    function calculateHeights() {
      const heights = {};

      formulas.forEach(formula => {
        const element = document.getElementById('formula-' + formula.id);
        if (element) {
          const container = element.parentElement;
          heights[formula.id] = container.offsetHeight;
        }
      });

      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'heights',
        heights: heights
      }));
    }

    // 重新渲染特定公式
    window.updateFormula = function(formulaId, formulaText, isInline) {
      const index = formulas.findIndex(f => f.id === formulaId);
      if (index !== -1) {
        formulas[index] = {
          id: formulaId,
          formula: formulaText,
          isInline: isInline
        };
        renderFormulas();
      }
    };

    // 监听来自 React Native 的消息
    window.addEventListener('message', function(event) {
      try {
        const message = JSON.parse(event.data);
        console.log('收到消息:', message);

        if (message.type === 'setFormulas' && message.formulas) {
          window.setFormulas(message.formulas);
        }
      } catch (error) {
        console.error('解析消息失败:', error);
      }
    });

    // 同时监听 document 的 message 事件（兼容性）
    document.addEventListener('message', function(event) {
      try {
        const message = JSON.parse(event.data);
        console.log('收到文档消息:', message);

        if (message.type === 'setFormulas' && message.formulas) {
          window.setFormulas(message.formulas);
        }
      } catch (error) {
        console.error('解析文档消息失败:', error);
      }
    });

  </script>
</body>
</html>
`;

/**
 * MathJax 渲染器组件
 */
export function MathJaxRenderer({ formulas, onComplete, onError }: MathJaxRendererProps) {
  const theme = useTheme();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formulaHeights, setFormulaHeights] = useState<{ [key: string]: number }>({});
  const [mathJaxUri, setMathJaxUri] = useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;
    const loadMathJaxAsset = async () => {
      try {
        logger.debug('[MathJax] 开始加载 MathJax 资源');
        logger.debug('[MathJax] Asset downloaded:', mathJaxAsset.downloaded);
        logger.debug('[MathJax] Asset localUri:', mathJaxAsset.localUri);
        logger.debug('[MathJax] Asset uri:', mathJaxAsset.uri);

        if (!mathJaxAsset.downloaded) {
          logger.debug('[MathJax] 资源未下载，开始下载...');
          await mathJaxAsset.downloadAsync();
          logger.debug('[MathJax] 资源下载完成');
        }

        const uri = mathJaxAsset.localUri ?? mathJaxAsset.uri;
        if (!uri) {
          throw new Error('MathJax asset missing URI');
        }

        logger.debug('[MathJax] 使用 URI:', uri);

        if (isMounted) {
          setMathJaxUri(uri);
          logger.debug('[MathJax] MathJax URI 设置完成');
        }
      } catch (assetError) {
        logger.error('[MathJax] 资源加载失败:', assetError);
        const message = 'MathJax 资源加载失败';
        setError(message);
        onError?.(message);
        setIsLoading(false);
      }
    };

    loadMathJaxAsset();
    return () => {
      isMounted = false;
    };
  }, [onError]);

  // 生成缓存键
  const cacheKey = React.useMemo(() => {
    const formulasStr = formulas.map(f => `${f.id}:${f.formula}:${f.isInline}`).join('|');
    // 简单的哈希函数
    let hash = 0;
    for (let i = 0; i < formulasStr.length; i++) {
      const char = formulasStr.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `mathjax_${Math.abs(hash).toString(36)}`;
  }, [formulas]);

  // 检查缓存
  React.useEffect(() => {
    const checkCache = async () => {
      try {
        const cachedHeights = await mathJaxCache.get(cacheKey);
        if (cachedHeights) {
          setFormulaHeights(cachedHeights);
          onComplete?.(cachedHeights);
          setIsLoading(false);
        }
      } catch (error) {
        logger.error('Failed to check MathJax cache:', error);
      }
    };

    if (formulas.length > 0) {
      checkCache();
    }
  }, [cacheKey, formulas, onComplete]);

  // 处理 WebView 消息
  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      logger.debug('[MathJax] WebView 消息:', data);

      switch (data.type) {
        case 'ready':
          logger.debug('[MathJax] MathJax 准备就绪');
          setIsLoading(false);
          // 发送公式数据到 WebView
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: 'setFormulas',
              formulas: formulas
            })
          );
          logger.debug('[MathJax] 已发送公式数据到 WebView, 公式数量:', formulas.length);
          break;

        case 'heights':
          logger.debug('[MathJax] 收到高度数据:', data.heights);
          setFormulaHeights(data.heights);

          // 缓存高度数据
          (async () => {
            try {
              await mathJaxCache.set(cacheKey, data.heights);
            } catch (error) {
              logger.error('Failed to cache MathJax heights:', error);
            }
          })();

          onComplete?.(data.heights);
          break;

        case 'error':
          logger.error('[MathJax] 渲染错误:', data.error);
          setError(data.error);
          onError?.(data.error);
          setIsLoading(false);
          break;

        default:
          logger.debug('[MathJax] 未知消息类型:', data.type);
      }
    } catch (err) {
      logger.error('[MathJax] 解析 WebView 消息失败:', err);
    }
  }, [formulas, onComplete, onError, cacheKey]);

  // 当公式数据更新时，重新渲染
  React.useEffect(() => {
    if (!isLoading && webViewRef.current) {
      webViewRef.current.postMessage(
        JSON.stringify({
          type: 'setFormulas',
          formulas: formulas
        })
      );
    }
  }, [formulas, isLoading]);

  // 生成 HTML 内容
  const baseFontSize = (theme as any)?.fonts?.bodyMedium?.fontSize ?? 16;
  const htmlContent = React.useMemo(() => {
    if (!mathJaxUri) {
      return null;
    }
    return MATHJAX_TEMPLATE(theme.dark ? 'dark' : 'light', baseFontSize, mathJaxUri);
  }, [theme.dark, baseFontSize, mathJaxUri]);

  if (error) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          数学公式渲染失败
        </Text>
        <Text style={[styles.errorDetail, { color: theme.colors.onSurfaceVariant }]}>
          {error}
        </Text>
      </View>
    );
  }

  const fallbackHtml = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body></body></html>';

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="small"
            color={theme.colors.primary}
            style={styles.loadingIndicator}
          />
          <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
            正在渲染数学公式...
          </Text>
        </View>
      )}

      <WebView
        ref={webViewRef}
        source={{ html: htmlContent ?? fallbackHtml }}
        style={[styles.webView, { height: Math.max(Object.values(formulaHeights).reduce((sum, h) => sum + h, 0), 80) }]}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="compatibility"
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        allowFileAccess={true}
        allowFileAccessFromFileURLs={true}
        onLoadStart={() => {
          logger.debug('[MathJax] WebView 开始加载');
        }}
        onLoadEnd={() => {
          logger.debug('[MathJax] WebView 加载完成');
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          logger.error('[MathJax] WebView 加载错误:', nativeEvent);
          setError(`WebView 加载失败: ${nativeEvent.description}`);
          setIsLoading(false);
        }}
        onLoad={() => {
          logger.debug('[MathJax] WebView onLoad 触发');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    minHeight: 1,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  loadingIndicator: {
    marginRight: 8,
  },
  loadingText: {
    fontSize: 14,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    borderRadius: 8,
    marginVertical: 8,
  },
  errorText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  errorDetail: {
    fontSize: 12,
    textAlign: 'center',
  },
  webView: {
    width: '100%',
    backgroundColor: 'transparent',
  },
});
