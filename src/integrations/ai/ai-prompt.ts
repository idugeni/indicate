export interface AiChatMessage {
  readonly role: 'user' | 'assistant' | 'model';
  readonly text: string;
}

export interface AiThinkingConfig {
  readonly thinkingBudget?: number;
  readonly includeThoughts?: boolean;
}

export interface AiSafetySetting {
  readonly category:
    | 'HARM_CATEGORY_HARASSMENT'
    | 'HARM_CATEGORY_HATE_SPEECH'
    | 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
    | 'HARM_CATEGORY_DANGEROUS_CONTENT'
    | 'HARM_CATEGORY_CIVIC_INTEGRITY';
  readonly threshold:
    | 'BLOCK_NONE'
    | 'BLOCK_ONLY_HIGH'
    | 'BLOCK_MEDIUM_AND_ABOVE'
    | 'BLOCK_LOW_AND_ABOVE'
    | 'HARM_BLOCK_THRESHOLD_UNSPECIFIED';
}

export interface AiChatImage {
  readonly base64: string;
  readonly mimeType: string;
}

export interface AiChatAudio {
  readonly base64: string;
  readonly mimeType: string;
}

export type AiResponseModality = 'TEXT' | 'IMAGE' | 'AUDIO';

export interface AiInlineData {
  readonly mimeType: string;
  readonly base64: string;
}

export interface AiChatPrompt {
  readonly prompt: string;
  readonly history?: readonly AiChatMessage[];
  readonly systemInstruction?: string;
  readonly temperature?: number;
  readonly topP?: number;
  readonly topK?: number;
  readonly maxOutputTokens?: number;
  readonly presencePenalty?: number;
  readonly frequencyPenalty?: number;
  readonly seed?: number;
  readonly responseMimeType?: string;
  readonly responseSchema?: Record<string, unknown>;
  readonly stopSequences?: readonly string[];
  readonly thinkingConfig?: AiThinkingConfig;
  readonly safetySettings?: readonly AiSafetySetting[];
  readonly enableTools?: boolean;
  readonly images?: readonly AiChatImage[];
  readonly audio?: readonly AiChatAudio[] | undefined;
  readonly responseModalities?: readonly AiResponseModality[] | undefined;
  readonly speechVoiceName?: string | undefined;
  readonly costMode?: 'throughput' | 'price' | undefined;
}

export interface AiTokensUsage {
  readonly prompt: number;
  readonly completion: number;
  readonly total: number;
}

export interface AiAdapterResponse {
  readonly text: string;
  readonly toolCallsExecuted: readonly string[];
  readonly toolResults?: Readonly<Record<string, unknown>>;
  readonly tokensUsage?: AiTokensUsage;
  readonly inlineData?: readonly AiInlineData[] | undefined;
}

export interface AiProviderAdapter {
  readonly providerId: string;
  /** Execute one prompt; `opts.signal` aborts the vendor fetch when set. */
  execute(
    plainApiKey: string,
    modelName: string,
    promptData: AiChatPrompt,
    opts?: { readonly signal?: AbortSignal | undefined } | undefined,
  ): Promise<AiAdapterResponse>;
}

export type AiToolExecutor = (toolName: string, args: Record<string, unknown>) => Promise<unknown>;
