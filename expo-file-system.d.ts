/**
 * expo-file-system 类型声明补充
 *
 * 解决 TypeScript 无法识别 File 和 Paths 导出的问题
 * expo-file-system v19+ 已支持这些 API
 */

declare module 'expo-file-system' {
  // 重新导出所有原有类型
  export * from 'expo-file-system/build';

  // 确保 File、Directory 和 Paths 可以被导出
  export { File, Directory, Paths } from 'expo-file-system/build/FileSystem';
}
