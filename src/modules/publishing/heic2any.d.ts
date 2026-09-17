declare module 'heic2any' {
  export interface HeicToAnyOptions {
    readonly blob: Blob;
    readonly toType?: 'image/jpeg' | 'image/png' | 'image/gif';
    readonly quality?: number;
    readonly gifInterval?: number;
    readonly multiple?: boolean;
  }
  export default function heic2any(options: HeicToAnyOptions): Promise<Blob | Blob[]>;
}
