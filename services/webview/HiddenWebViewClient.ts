import { Platform } from 'react-native'

// 通过隐藏 WebView 抓取页面 HTML 的简单客户端
// Host 组件挂载后会调用 registerHost 注册，这里提供 Promise 风格的 loadHtml 接口

type Task = {
  id: string
  url: string
  timeout: number
  resolve: (html: string) => void
  reject: (err: any) => void
}

type HostApi = {
  load: (task: { id: string; url: string; timeout: number }) => void
}

const tasks: Map<string, Task> = new Map()
let host: HostApi | null = null
let seq = 0

export function registerHiddenWebViewHost(api: HostApi) {
  host = api
}

export function isHiddenWebViewAvailable() {
  return !!host && (Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web')
}

export async function loadHtmlViaHiddenWebView(url: string, timeout = 10000): Promise<string> {
  if (!host) {
    throw new Error('HiddenWebView host is not mounted')
  }
  return new Promise<string>((resolve, reject) => {
    const id = `wv-${Date.now()}-${seq++}`
    const task: Task = { id, url, timeout, resolve, reject }
    tasks.set(id, task)
    host!.load({ id, url, timeout })
  })
}

// 供 Host 回调
export function resolveHiddenWebViewTask(id: string, html: string) {
  const t = tasks.get(id)
  if (!t) return
  tasks.delete(id)
  t.resolve(html)
}

export function rejectHiddenWebViewTask(id: string, err: any) {
  const t = tasks.get(id)
  if (!t) return
  tasks.delete(id)
  t.reject(err)
}
