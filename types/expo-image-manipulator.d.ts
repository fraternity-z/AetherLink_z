declare module 'expo-image-manipulator' {
  export interface ImageResult {
    uri: string;
    width: number;
    height: number;
    base64?: string;
  }

  export type Action = { resize: { width?: number; height?: number } };

  export enum SaveFormat {
    JPEG = 'jpeg',
    PNG = 'png',
    WEBP = 'webp',
    HEIF = 'heif',
  }

  export interface SaveOptions {
    compress?: number;
    format?: SaveFormat;
    base64?: boolean;
  }

  export function manipulateAsync(
    uri: string,
    actions: Action[],
    options?: SaveOptions
  ): Promise<ImageResult>;
}
