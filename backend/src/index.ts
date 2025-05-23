import { connectToDB } from "./mongo";
import { config } from "dotenv";

config();

let db: Awaited<ReturnType<typeof connectToDB>>;

const start = async () => {
  db = await connectToDB();
};

await start();

const parseJSONBody = async (req: Request) => {
  const text = await req.text();
  if (!text) throw new Error("EmptyBody");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("InvalidJSON");
  }
};

const server = Bun.serve({
  port: 3000,
  fetch: async (req) => {
    const url = new URL(req.url);

    // GET /
    if (req.method === "GET" && url.pathname === "/") {
      return new Response("Olá, mundo!", { status: 200 });
    }

    // POST /mail
    if (req.method === "POST" && url.pathname === "/mail") {
      try {
        const body = await parseJSONBody(req) as { mail: boolean };

        if (typeof body.mail !== "boolean") {
          return new Response(JSON.stringify({ error: "Invalid 'mail' format" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (body.mail) {
          const mailCollection = db.collection("mailbox");

          const last = await mailCollection.find().sort({ count: -1 }).limit(1).toArray();
          const currentCount = last[0]?.count ?? 0;
          const newCount = currentCount + 1;

          await mailCollection.insertOne({
            count: newCount,
            timestamp: new Date(),
          });

          return new Response(JSON.stringify({ message: "Mail event logged", count: newCount }), {
            status: 201,
            headers: { "Content-Type": "application/json" },
          });
        } else {
          return new Response(JSON.stringify({ message: "No mail received" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
      } catch (err: any) {
        console.error(err);
        if (err.message === "EmptyBody") {
          return new Response(JSON.stringify({ error: "Request body is empty" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (err.message === "InvalidJSON") {
          return new Response(JSON.stringify({ error: "Invalid JSON format" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Failed to handle /mail request" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // POST /temperature
    if (req.method === "POST" && url.pathname === "/temperature") {
      try {
        const body = await parseJSONBody(req) as { temperature: number };

        if (typeof body.temperature !== "number") {
          return new Response(JSON.stringify({ error: "Invalid 'temperature' format" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
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
          return new Response(JSON.stringify({ error: "Request body is empty" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        if (err.message === "InvalidJSON") {
          return new Response(JSON.stringify({ error: "Invalid JSON format" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Failed to handle /temperature request" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // 404 fallback
    return new Response("Página não encontrada", { status: 404 });
  },
});

console.log(`Servidor a correr em http://localhost:3000`);
