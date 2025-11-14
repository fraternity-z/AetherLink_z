import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import {
  registerHiddenWebViewHost,
  resolveHiddenWebViewTask,
  rejectHiddenWebViewTask
} from '@/services/webview/HiddenWebViewClient'

// 隐藏的 WebView Host：负责加载 URL，拿到完整 HTML 后 postMessage 回传
// 性能：复用单个 WebView；串行处理任务；10s 默认超时

export default function HiddenWebViewHost() {
  const webviewRef = useRef<WebView>(null)
  const [current, setCurrent] = useState<{ id: string; url: string; timeout: number } | null>(null)
  const queueRef = useRef<{ id: string; url: string; timeout: number }[]>([])
  const timeoutRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current as any)
      timeoutRef.current = null
    }
  }, [])

  const onMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data)
      if (data && data.id && typeof data.html === 'string') {
        resolveHiddenWebViewTask(data.id, data.html)
      }
    } catch {
      // ignore
    } finally {
      clearTimer()
      const next = queueRef.current.shift()
      if (next) {
        startTask(next)
      } else {
        setCurrent(null)
      }
    }
  }, [clearTimer, startTask])

  const onLoadEnd = useCallback(() => {
    if (!current) return
    // 注入脚本提取完整 HTML
    const js = `
      (function(){
        try {
          const html = document.documentElement.outerHTML;
          window.ReactNativeWebView.postMessage(JSON.stringify({ id: '${current.id}', html }));
        } catch (e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ id: '${current.id}', html: '' }));
        }
      })();
      true;
    `
    webviewRef.current?.injectJavaScript(js)
  }, [current])

  const startTask = useCallback((task: { id: string; url: string; timeout: number }) => {
    clearTimer()
    timeoutRef.current = setTimeout(() => {
      rejectHiddenWebViewTask(task.id, new Error('HiddenWebView timeout'))
      setCurrent(null)
    }, Math.max(1000, task.timeout)) as any

    setCurrent(task)
  }, [clearTimer])

  const load = useCallback((task: { id: string; url: string; timeout: number }) => {
    if (current) {
      queueRef.current.push(task)
    } else {
      startTask(task)
    }
  }, [current, startTask])

  useEffect(() => {
    registerHiddenWebViewHost({ load })
  }, [load])

  return (
    <View pointerEvents="none" style={styles.container}>
      {current && (
        <WebView
          ref={webviewRef}
          source={{ uri: current.url }}
          style={styles.webview}
          onMessage={onMessage}
          onLoadEnd={onLoadEnd}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          originWhitelist={["*"]}
          userAgent={
            'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) ' +
            'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    width: 0,
    height: 0,
    overflow: 'hidden'
  },
  webview: {
    width: 1,
    height: 1,
    opacity: 0
  }
})
