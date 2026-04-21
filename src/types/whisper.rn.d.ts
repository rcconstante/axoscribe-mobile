declare module 'whisper.rn' {
  export interface WhisperRealtimeData {
    result: string;
    segments?: Array<{ text: string; t0: number; t1: number }>;
  }

  export interface WhisperRealtimeEvent {
    isCapturing: boolean;
    data?: WhisperRealtimeData;
    error?: string;
    code?: number;
  }

  export interface WhisperRealtimeOptions {
    language?: string;
    realtimeAudioSec?: number;
    realtimeAudioSliceSec?: number;
    realtimeAudioMinSec?: number;
    maxLen?: number;
    tokenTimestamps?: boolean;
  }

  export interface WhisperTranscribeOptions {
    language?: string;
    maxLen?: number;
    tokenTimestamps?: boolean;
  }

  export interface WhisperContext {
    transcribeRealtime(options?: WhisperRealtimeOptions): Promise<{
      stop: () => void;
      subscribe: (callback: (event: WhisperRealtimeEvent) => void) => void;
    }>;
    transcribe(
      path: string,
      options?: WhisperTranscribeOptions,
    ): Promise<{ result: string }>;
    release(): Promise<void>;
  }

  export interface InitWhisperOptions {
    filePath: string;
    isBundleAsset?: boolean;
  }

  export function initWhisper(options: InitWhisperOptions): Promise<WhisperContext>;
}
