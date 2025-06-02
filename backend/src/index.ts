import { connectToDB } from "./mongo";
import { config } from "dotenv";
import {
  createACP,
  createAE,
  createContainer,
  createContentInstance,
  checkAEExists,
  defaultConfig,
} from "./acmeClient";
import { getLastMailCount, getLastTemperature, parseJSONBody } from "./utils";
import { addClient, removeClient, notifyAllClients } from "./ws-clients";
config();

let db: Awaited<ReturnType<typeof connectToDB>>;
await (async () => {
  // even if no connection to db is made (we are at school, port is disabled),
  // we can still run the api to serve the acme requests to onem2m
  try {
    db = await connectToDB();
  } catch (error) {
    console.log("Erro ao conectar ao MongoDB");
  }
})();

const websocketHandlers = {
  open: addClient,
  message(ws: any, message: any) {
    ws.send(
      `Echo: ${typeof message === "string" ? message : message.toString()}`
    );
  },
  close: removeClient,
};

async function handleRestRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const { method, pathname } = { method: req.method, pathname: url.pathname };

  // CORS preflight
  if (method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  if (method === "GET" && pathname === "/")
    return new Response("Olá, mundo!", {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
    });

  if (method === "GET" && pathname === "/mail") {
    try {
      const count = await getLastMailCount(db);
      return json({ count });
    } catch {
      return json({ error: "Failed to fetch mail data" }, 500);
    }
  }

  if (method === "POST" && pathname === "/setupOneM2M") {
    const stream = new ReadableStream({
      async start(controller) {
        const send = (msg: string) => controller.enqueue(msg + "\n");

        try {
          send("Creating ACP...");
          send(await createACP(defaultConfig));

          send("Creating AE...");
          send(await createAE(defaultConfig));

          const ae_exists = await checkAEExists(defaultConfig);
          if (!ae_exists) {
            send("AE does not exist. Please create the AE first.");
            controller.close();
            return;
          }
          send("\nAE exists.\n");

          send("Creating containers...");
          const containerResults = await Promise.all([
            createContainer("mailbox", defaultConfig),
            createContainer("temperature", defaultConfig),
            createContainer("humidity", defaultConfig),
          ]);
          containerResults.forEach(send);

          send("\nCreating content instances...");
          const contentResults = await Promise.all([
            createContentInstance("mailbox", "Novo pacote entregue às 13:00", defaultConfig),
            createContentInstance("temperature", "22.3°C", defaultConfig),
            createContentInstance("humidity", "54%", defaultConfig),
          ]);
          contentResults.forEach(send);
          console.log("\nOneM2M setup completed.")
          send("\nOneM2M setup completed.");
        } catch (err: any) {
          send("Error: " + (err.message || "Failed to setup OneM2M"));
        }
        controller.close();
      }
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Transfer-Encoding": "chunked",
      },
    });
  }

  if (method === "GET" && pathname === "/temperature") {
    try {
      const temperature = await getLastTemperature(db);
      return json({ temperature });
    } catch {
      return json({ error: "Failed to fetch temperature data" }, 500);
    }
  }

  if (method === "POST" && pathname === "/mail") {
    try {
      const body = await parseJSONBody(req);
      if (body.mail !== true) return json({ message: "No mail received" });
      const mailCollection = db.collection("mailbox");
      const newCount = (await getLastMailCount(db)) + 1;
      await mailCollection.insertOne({
        count: newCount,
        timestamp: new Date(),
      });

      notifyAllClients("new-mail", { count: newCount });

      return json({ message: "Mail event logged", count: newCount }, 201);
    } catch (err: any) {
      return json(
        { error: err.message || "Failed to handle /mail request" },
        400
      );
    }
  }

  if (method === "POST" && pathname === "/temperature") {
    try {
      const body = await parseJSONBody(req);
      if (typeof body.temperature !== "number")
        throw new Error("Invalid temperature");

      await db
        .collection("temperatures")
        .insertOne({ temperature: body.temperature, timestamp: new Date() });

      notifyAllClients("new-temperature", { temperature: body.temperature });

      return json({ message: "Temperature saved" }, 201);
    } catch (err: any) {
      return json(
        { error: err.message || "Failed to handle /temperature request" },
        400
      );
    }
  }

  return new Response("Página não encontrada", {
    status: 404,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
}

function json(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

const port = Number(process.env.PORT) || 3000;
Bun.serve({
  port,
  idleTimeout: 20, // 20 seconds
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
