// SOFIA Trade — AI Router types & defaults (PRD §42-49).
export type AiTask = "chat" | "narrative" | "analysis" | "news";
export interface AiProviderConfig {
  id: string; label: string; model: string; apiKeyEnv: string;
  baseUrl: string; costPer1kInputUsd: number; costPer1kOutputUsd: number;
  maxTokens: number; active: boolean; priority: number;
}
export interface AiProviderUsage { costUsd: number; requests: number; errors: number; }
export interface AiUsageDay {
  date: string; costUsd: number; requests: number; cacheHits: number;
  byProvider: Record<string, AiProviderUsage>;
}
export interface AiHealth {
  ok: boolean; latencyMs: number | null; errorRate: number;
  lastCheckAt: string | null; lastError: string | null;
}
export interface AiRouterState {
  providers: AiProviderConfig[];
  taskRoutes: Record<AiTask, string[]>;
  budgetDailyUsd: number; budgetMonthlyUsd: number; cacheTtlMs: number;
  usageToday: AiUsageDay; usageMonth: AiUsageDay;
  health: Record<string, AiHealth>;
}
export interface AiCacheEntry {
  reply: string; providerId: string; model: string; createdAt: number;
  inTok: number; outTok: number; costUsd: number; providerLabel: string;
}
export const DEFAULT_PROVIDERS: AiProviderConfig[] = [
  { id: "deepseek", label: "DeepSeek", model: "deepseek-chat", apiKeyEnv: "DEEPSEEK_API_KEY", baseUrl: "https://api.deepseek.com/v1", costPer1kInputUsd: 0.00014, costPer1kOutputUsd: 0.00028, maxTokens: 1024, active: true, priority: 1 },
  { id: "groq", label: "Groq", model: "llama-3.3-70b-versatile", apiKeyEnv: "GROQ_API_KEY", baseUrl: "https://api.groq.com/openai/v1", costPer1kInputUsd: 0.00027, costPer1kOutputUsd: 0.0004, maxTokens: 1024, active: true, priority: 2 },
  { id: "gemini", label: "Gemini", model: "gemini-2.0-flash", apiKeyEnv: "GEMINI_API_KEY", baseUrl: "https://generativelanguage.googleapis.com/v1beta", costPer1kInputUsd: 0.0001, costPer1kOutputUsd: 0.0004, maxTokens: 1024, active: true, priority: 3 },
  { id: "openrouter", label: "OpenRouter", model: "meta-llama/llama-3.3-70b-instruct:free", apiKeyEnv: "OPENROUTER_API_KEY", baseUrl: "https://openrouter.ai/api/v1", costPer1kInputUsd: 0, costPer1kOutputUsd: 0, maxTokens: 1024, active: true, priority: 4 },
  { id: "openai", label: "OpenAI", model: "gpt-4o-mini", apiKeyEnv: "OPENAI_API_KEY", baseUrl: "https://api.openai.com/v1", costPer1kInputUsd: 0.00015, costPer1kOutputUsd: 0.0006, maxTokens: 1024, active: true, priority: 5 },
  { id: "anthropic", label: "Anthropic", model: "claude-3-5-haiku-latest", apiKeyEnv: "ANTHROPIC_API_KEY", baseUrl: "https://api.anthropic.com/v1", costPer1kInputUsd: 0.0008, costPer1kOutputUsd: 0.004, maxTokens: 1024, active: true, priority: 6 },
  { id: "qwen", label: "Qwen", model: "qwen-plus", apiKeyEnv: "QWEN_API_KEY", baseUrl: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", costPer1kInputUsd: 0.0004, costPer1kOutputUsd: 0.0012, maxTokens: 1024, active: true, priority: 7 },
  { id: "grok", label: "Grok (xAI)", model: "grok-3-mini", apiKeyEnv: "GROK_API_KEY", baseUrl: "https://api.x.ai/v1", costPer1kInputUsd: 0.0003, costPer1kOutputUsd: 0.0005, maxTokens: 1024, active: true, priority: 8 },
];
export const DEFAULT_ROUTES: Record<AiTask, string[]> = {
  chat: ["deepseek", "groq", "gemini", "openrouter", "openai", "anthropic", "qwen", "grok"],
  narrative: ["deepseek", "groq", "gemini", "openai"],
  analysis: ["anthropic", "openai", "deepseek", "gemini"],
  news: ["gemini", "groq", "openai"],
};
