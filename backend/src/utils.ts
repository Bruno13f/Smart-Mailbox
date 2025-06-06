import type { RequestInit, Response } from "node-fetch";
import AbortController from "abort-controller";

export async function parseJSONBody(req: Request): Promise<any> {
  try {
    return JSON.parse(await req.text());
  } catch {
    throw new Error("InvalidJSON");
  }
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3,
  delay = 500
): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5 segundos

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok && i === retries) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      if (i === retries) throw error;
      console.warn(`Retry ${i + 1}/${retries} failed: ${error}`);
      await new Promise((res) => setTimeout(res, delay));
    }
  }

  throw new Error("Max retries exceeded");
}
