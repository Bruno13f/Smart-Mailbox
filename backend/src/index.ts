import { connectToDB } from "./mongo";
import { config } from "dotenv";

config();

let db: Awaited<ReturnType<typeof connectToDB>>;

const start = async () => {
  db = await connectToDB();
};

await start();

const wsClients = new Set<any>();

const websocketHandlers = {
  open(ws: any) {
    wsClients.add(ws);
    console.log("Cliente conectado.");
  },
  message(ws: any, message: any) {
    const msg = typeof message === "string" ? message : message.toString();
    console.log(`Mensagem recebida: ${msg}`);
    ws.send(`Echo: ${msg}`);
  },
  close(ws: any, code?: number, reason?: string) {
    wsClients.delete(ws);
    console.log("Cliente desconectado.", { code, reason });
  },
};

function notifyAllClients(message: string) {
  for (const ws of wsClients) {
    // Use 1 for OPEN state in Bun's WebSocket implementation
    console.log("Notifying client, readyState:", ws.readyState);
    try {
      if (ws.readyState === 1) {
        ws.send(message);
        console.log("Message sent to client");
      } else {
        console.log("Client not open, skipping");
      }
    } catch (err) {
      console.log("Error sending to client:", err);
    }
  }
}

const parseJSONBody = async (req: Request) => {
  const text = await req.text();
  if (!text) throw new Error("EmptyBody");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("InvalidJSON");
  }
};

async function handleRestRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);

  // GET /
  if (req.method === "GET" && url.pathname === "/") {
    return new Response("Olá, mundo!", { status: 200 });
  }

  // POST /mail
  if (req.method === "POST" && url.pathname === "/mail") {
    try {
      const body = (await parseJSONBody(req)) as { mail: boolean };
      if (typeof body.mail !== "boolean") {
        return new Response(
          JSON.stringify({ error: "Invalid 'mail' format" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      if (body.mail) {
        const mailCollection = db.collection("mailbox");
        const last = await mailCollection
          .find()
          .sort({ count: -1 })
          .limit(1)
          .toArray();
        const currentCount = last[0]?.count ?? 0;
        const newCount = currentCount + 1;
        await mailCollection.insertOne({
          count: newCount,
          timestamp: new Date(),
        });

        notifyAllClients("Nova carta recebida!");
        console.log("Notificado todos os clientes WebSocket sobre nova carta.");

        return new Response(
          JSON.stringify({ message: "Mail event logged", count: newCount }),
          {
            status: 201,
            headers: { "Content-Type": "application/json" },
          }
        );
      } else {
        return new Response(JSON.stringify({ message: "No mail received" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === "EmptyBody") {
        return new Response(
          JSON.stringify({ error: "Request body is empty" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      if (err.message === "InvalidJSON") {
        return new Response(JSON.stringify({ error: "Invalid JSON format" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ error: "Failed to handle /mail request" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // POST /temperature
  if (req.method === "POST" && url.pathname === "/temperature") {
    try {
      const body = (await parseJSONBody(req)) as { temperature: number };
      if (typeof body.temperature !== "number") {
        return new Response(
          JSON.stringify({ error: "Invalid 'temperature' format" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      const tempCollection = db.collection("temperatures");
      await tempCollection.insertOne({
        temperature: body.temperature,
        timestamp: new Date(),
      });
      return new Response(JSON.stringify({ message: "Temperature saved" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (err: any) {
      console.error(err);
      if (err.message === "EmptyBody") {
        return new Response(
          JSON.stringify({ error: "Request body is empty" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      if (err.message === "InvalidJSON") {
        return new Response(JSON.stringify({ error: "Invalid JSON format" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ error: "Failed to handle /temperature request" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  // POST /cartas
  if (req.method === "POST" && url.pathname === "/cartas") {
    console.log("Notificado todos os clientes WebSocket sobre nova carta.");
    return new Response("Cartas no correio", { status: 200 });
  }

  // 404 fallback
  return new Response("Página não encontrada", { status: 404 });
}

const server = Bun.serve({
  port: Number(process.env.PORT) || 3000,
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === "/ws" && server.upgrade) {
      console.log("Attempting WebSocket upgrade...");
      const success = server.upgrade(req);
      if (!success) {
        console.log("WebSocket upgrade failed");
      }
      return;
    }
    return handleRestRequest(req);
  },
  websocket: websocketHandlers,
});

console.log(`Servidor a correr em http://localhost:3000`);
