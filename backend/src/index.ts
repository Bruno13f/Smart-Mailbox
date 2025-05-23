import { connectToDB } from "./mongo";
import { config } from "dotenv";
config();

let db: Awaited<ReturnType<typeof connectToDB>>;
await (async () => {
  db = await connectToDB();
})();

const wsClients = new Set<any>();

const websocketHandlers = {
  open(ws: any) {
    wsClients.add(ws);
    console.log("Cliente conectado.");
  },
  message(ws: any, message: any) {
    ws.send(
      `Echo: ${typeof message === "string" ? message : message.toString()}`
    );
  },
  close(ws: any) {
    wsClients.delete(ws);
    console.log("Cliente desconectado.");
  },
};

function notifyAllClients(message: string) {
  for (const ws of wsClients) {
    try {
      if (ws.readyState === 1) ws.send(message);
    } catch {}
  }
}

const parseJSONBody = async (req: Request) => {
  try {
    return JSON.parse(await req.text());
  } catch {
    throw new Error("InvalidJSON");
  }
};

async function getLastMailCount() {
  const last = await db
    .collection("mailbox")
    .find()
    .sort({ count: -1 })
    .limit(1)
    .toArray();
  return last[0]?.count ?? 0;
}

async function handleRestRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  if (req.method === "GET" && url.pathname === "/") {
    return new Response("Olá, mundo!", { status: 200 });
  }
  if (req.method === "GET" && url.pathname === "/mail") {
    try {
      const last = await getLastMailCount();
      return new Response(JSON.stringify({ count: last }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to fetch mail data" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  if (req.method === "POST" && url.pathname === "/mail") {
    try {
      const body = await parseJSONBody(req);
      if (body.mail !== true)
        return new Response(JSON.stringify({ message: "No mail received" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      const mailCollection = db.collection("mailbox");
      const newCount = (await getLastMailCount()) + 1;
      await mailCollection.insertOne({
        count: newCount,
        timestamp: new Date(),
      });
      notifyAllClients("Nova carta recebida!");
      return new Response(
        JSON.stringify({ message: "Mail event logged", count: newCount }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          error: err.message || "Failed to handle /mail request",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  if (req.method === "POST" && url.pathname === "/temperature") {
    try {
      const body = await parseJSONBody(req);
      if (typeof body.temperature !== "number")
        throw new Error("Invalid temperature");
      await db
        .collection("temperatures")
        .insertOne({ temperature: body.temperature, timestamp: new Date() });
      return new Response(JSON.stringify({ message: "Temperature saved" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      return new Response(
        JSON.stringify({
          error: err.message || "Failed to handle /temperature request",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
  }
  return new Response("Página não encontrada", { status: 404 });
}

const port = Number(process.env.PORT) || 3000;
Bun.serve({
  port: port,
  fetch(req, server) {
    if (new URL(req.url).pathname === "/ws" && server.upgrade) {
      server.upgrade(req);
      return;
    }
    return handleRestRequest(req);
  },
  websocket: websocketHandlers,
});

console.log(`Servidor a correr em http://localhost:${port}`);
