// ============================================================
// SOFIA Trade — AI provider HTTP adapters (PRD §42-49)
// Tanpa dep baru: semua via fetch HTTPS.
// OpenAI-style: OpenAI/OpenRouter/DeepSeek/Grok/Qwen/Groq.
// Khusus: Anthropic Messages API, Gemini generateContent.
// ============================================================

export interface ProviderCallResult {
  text: string;
  inTok: number;
  outTok: number;
}

export function estTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

async function postJson(url: string, headers: Record<string, string>, body: unknown, timeoutMs: number): Promise<{ ok: boolean; status: number; json: Record<string, unknown> }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers,
      signal: ctl.signal,
      body: JSON.stringify(body),
    });
    const json = (await r.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: r.ok, status: r.status, json };
  } finally {
    clearTimeout(t);
  }
}

function errMsg(j: Record<string, unknown>, status: number): string {
  const e = j.error as { message?: string } | string | undefined;
  if (typeof e === "string") return e;
  return e?.message || `HTTP ${status}`;
}

export async function callOpenAiStyle(opts: {
  baseUrl: string; apiKey: string; model: string; maxTokens: number;
  system: string; user: string; timeoutMs: number; extraHeaders?: Record<string, string>;
}): Promise<ProviderCallResult> {
  const { ok, status, json } = await postJson(
    `${opts.baseUrl}/chat/completions`,
    { "content-type": "application/json", authorization: `Bearer ${opts.apiKey}`, ...(opts.extraHeaders || {}) },
    {
      model: opts.model,
      max_tokens: Math.min(opts.maxTokens, 1024),
      temperature: 0.3,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    },
    opts.timeoutMs
  );
  if (!ok) throw new Error(errMsg(json, status));
  const choices = json.choices as Array<{ message?: { content?: string } }> | undefined;
  const text = choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("Respons kosong dari provider");
  const usage = json.usage as { prompt_tokens?: number; completion_tokens?: number } | undefined;
  return {
    text,
    inTok: usage?.prompt_tokens ?? estTokens(opts.system + opts.user),
    outTok: usage?.completion_tokens ?? estTokens(text),
  };
}

export async function callAnthropic(opts: {
  baseUrl: string; apiKey: string; model: string; maxTokens: number;
  system: string; user: string; timeoutMs: number;
}): Promise<ProviderCallResult> {
  const { ok, status, json } = await postJson(
    `${opts.baseUrl}/messages`,
    { "content-type": "application/json", "x-api-key": opts.apiKey, "anthropic-version": "2023-06-01" },
    { model: opts.model, max_tokens: Math.min(opts.maxTokens, 1024), system: opts.system, messages: [{ role: "user", content: opts.user }] },
    opts.timeoutMs
  );
  if (!ok) throw new Error(errMsg(json, status));
  const content = json.content as Array<{ text?: string }> | undefined;
  const text = (content || []).map((c) => c.text || "").join("").trim();
  if (!text) throw new Error("Respons kosong dari Anthropic");
  const usage = json.usage as { input_tokens?: number; output_tokens?: number } | undefined;
  return {
    text,
    inTok: usage?.input_tokens ?? estTokens(opts.system + opts.user),
    outTok: usage?.output_tokens ?? estTokens(text),
  };
}

export async function callGemini(opts: {
  baseUrl: string; apiKey: string; model: string; maxTokens: number;
  system: string; user: string; timeoutMs: number;
}): Promise<ProviderCallResult> {
  const url = `${opts.baseUrl}/models/${opts.model}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;
  const { ok, status, json } = await postJson(
    url,
    { "content-type": "application/json" },
    {
      system_instruction: { parts: [{ text: opts.system }] },
      contents: [{ parts: [{ text: opts.user }] }],
      generationConfig: { maxOutputTokens: Math.min(opts.maxTokens, 1024), temperature: 0.3 },
    },
    opts.timeoutMs
  );
  if (!ok) throw new Error(errMsg(json, status));
  const cands = json.candidates as Array<{ content?: { parts?: Array<{ text?: string }> } }> | undefined;
  const text = (cands?.[0]?.content?.parts || []).map((x) => x.text || "").join("").trim();
  if (!text) throw new Error("Respons kosong dari Gemini");
  const meta = json.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number } | undefined;
  return {
    text,
    inTok: meta?.promptTokenCount ?? estTokens(opts.system + opts.user),
    outTok: meta?.candidatesTokenCount ?? estTokens(text),
  };
}
