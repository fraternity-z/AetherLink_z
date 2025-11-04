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
import { mathJaxCache } from '@/utils/render-cache';

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

/**
 * MathJax HTML 模板
 */
const MATHJAX_TEMPLATE = (theme: 'light' | 'dark') => `
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
          console.log('MathJax is ready');
          MathJax.startup.defaultReady();
          MathJax.startup.promise.then(() => {
            console.log('MathJax startup complete');
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
  <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background-color: ${theme === 'dark' ? '#1e1e1e' : '#ffffff'};
      color: ${theme === 'dark' ? '#ffffff' : '#000000'};
      font-size: 16px;
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
      console.log('Setting formulas:', formulaData);
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
          console.log('MathJax rendering complete');
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

      console.log('Calculated heights:', heights);
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

    console.log('MathJax WebView loaded');
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
          console.log('Using cached MathJax heights:', cachedHeights);
          setFormulaHeights(cachedHeights);
          onComplete?.(cachedHeights);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to check MathJax cache:', error);
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

      switch (data.type) {
        case 'ready':
          console.log('MathJax WebView ready');
          setIsLoading(false);
          // 发送公式数据到 WebView
          webViewRef.current?.postMessage(
            JSON.stringify({
              type: 'setFormulas',
              formulas: formulas
            })
          );
          break;

        case 'heights':
          console.log('Received heights:', data.heights);
          setFormulaHeights(data.heights);

          // 缓存高度数据
          mathJaxCache.set(cacheKey, data.heights).catch(error => {
            console.error('Failed to cache MathJax heights:', error);
          });

          onComplete?.(data.heights);
          break;

        case 'error':
          console.error('MathJax error:', data.error);
          setError(data.error);
          onError?.(data.error);
          setIsLoading(false);
          break;

        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (err) {
      console.error('Failed to parse WebView message:', err);
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
  const htmlContent = React.useMemo(() => {
    return MATHJAX_TEMPLATE(theme.dark ? 'dark' : 'light');
  }, [theme.dark]);

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
        source={{ html: htmlContent }}
        style={[styles.webView, { height: Object.values(formulaHeights).reduce((sum, h) => sum + h, 0) || 1 }]}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        originWhitelist={['*']}
        mixedContentMode="compatibility"
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error:', nativeEvent);
          setError(`WebView 加载失败: ${nativeEvent.description}`);
          setIsLoading(false);
        }}
        onLoad={() => {
          console.log('WebView loaded');
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