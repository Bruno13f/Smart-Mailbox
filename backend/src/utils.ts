import { Db } from "mongodb";

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

export async function parseJSONBody(req: Request): Promise<any> {
  try {
    return JSON.parse(await req.text());
  } catch {
    throw new Error("InvalidJSON");
  }
}
