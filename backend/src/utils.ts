import { Db } from "mongodb";
import type { RequestInit, Response } from "node-fetch";
import AbortController from "abort-controller";

export async function getLastMailCount(db: Db): Promise<number> {
  const last = await db
    .collection("mailbox")
    .find()
    .sort({ count: -1 })
    .limit(1)
    .toArray();
  return last[0]?.count ?? 0;
}

export async function getLastTemperature(db: Db): Promise<number> {
  const last = await db
    .collection("temperatures")
    .find()
    .sort({ timestamp: -1 })
    .limit(1)
    .toArray();
  const temperature = last[0]?.temperature ?? 0;
  return temperature;
}

export async function getLastHumidity(db: Db): Promise<number> {
  const last = await db
    .collection("humidity")
    .find()
    .sort({ timestamp: -1 })
    .limit(1)
    .toArray();
  const humidity = last[0]?.humidity ?? 0;
  return humidity;
}

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
