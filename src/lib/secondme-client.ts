import { createParser } from "eventsource-parser";

const BASE_URL = process.env.SECONDME_API_BASE_URL ?? "https://app.mindos.com/gate/lab";
const DEFAULT_ACT_TIMEOUT_MS = 12000;
const DEFAULT_CHAT_TIMEOUT_MS = 12000;

type StreamCallOptions = {
  timeoutMs?: number;
};

export async function callAct(
  token: string,
  message: string,
  actionControl: string,
  options?: StreamCallOptions
) {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_ACT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${BASE_URL}/api/secondme/act/stream`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        message,
        actionControl,
      }),
    });

    if (!res.ok) {
      console.error("Act API failed", res.status, await res.text());
      return null;
    }

    const reader = res.body?.getReader();
    if (!reader) return null;

    const decoder = new TextDecoder();
    let resultJsonStr = "";
    
    const parser = createParser({
      onEvent: (event) => {
        if (event.data === "[DONE]") return;
        try {
          const json = JSON.parse(event.data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            resultJsonStr += content;
          }
        } catch (e) {
          // ignore
        }
      }
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
    }

    try {
        const match = resultJsonStr.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        return JSON.parse(resultJsonStr);
    } catch (e) {
        console.error("Failed to parse Act result", resultJsonStr);
        return null;
    }

  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      console.warn(`[callAct] Timeout after ${timeoutMs}ms`);
      return null;
    }
    console.error("Call Act Error", e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callChat(
  token: string,
  messages: {role: string, content: string}[],
  systemPrompt?: string,
  options?: StreamCallOptions
) {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_CHAT_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    // Note: The SecondMe API documentation in the skill might refer to /chat/stream or similar.
    // Let's assume a standard chat completion endpoint structure for SecondMe or use a simplified one if available.
    // Based on reference, /api/secondme/act/stream is for structured JSON.
    // For text generation, we usually use /api/secondme/chat/stream or similar.
    // Let's use the provided endpoint structure.
    
    // Construct request body
    const body: Record<string, unknown> = {
      messages,
      stream: true
    };
    if (systemPrompt) {
        // Some APIs take system prompt as a separate field or as the first message
        // Let's try adding it as the first system message
        body.messages = [{role: "system", content: systemPrompt}, ...messages];
        // Also add it as a top-level field just in case
        body.systemPrompt = systemPrompt;
    }

    const res = await fetch(`${BASE_URL}/api/secondme/chat/stream`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
      },
      signal: controller.signal,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
        const errorText = await res.text();
        console.error(`[CallChat] API failed with status ${res.status}: ${errorText}`);
        return null;
    }

    const reader = res.body?.getReader();
    if (!reader) {
        console.error("[CallChat] Response body is not readable (no reader).");
        return null;
    }

    const decoder = new TextDecoder();
    let fullText = "";
    
    const parser = createParser({
      onEvent: (event) => {
        if (event.data === "[DONE]") return;
        try {
          const json = JSON.parse(event.data);
          const content = json.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
          }
        } catch (e) {
          // ignore
        }
      }
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value));
    }

    return fullText;

  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      console.warn(`[callChat] Timeout after ${timeoutMs}ms`);
      return null;
    }
    console.error("Call Chat Error", e);
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
