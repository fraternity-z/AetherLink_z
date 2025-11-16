declare module 'expo-file-system' {
export * from 'expo-file-system/build/ExpoFileSystem';
export const documentDirectory: string | null;

export function moveAsync(params: { from: string; to: string }): Promise<void>;
export function getInfoAsync(fileUri: string): Promise<{ exists: boolean; size: number }>;
export function deleteAsync(fileUri: string): Promise<void>;
export function makeDirectoryAsync(dirUri: string, options?: { intermediates?: boolean }): Promise<void>;
export function getFreeDiskStorageAsync(): Promise<number>;
}
