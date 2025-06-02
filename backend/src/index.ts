import { connectToDB } from "./mongo";
import { config } from "dotenv";
import {
  createACP,
  createAE,
  createContainer,
  createContentInstance,
  checkAEExists,
  defaultConfig,
  butlerConfig,
} from "./acmeClient";
import { getLastHumidity, getLastMailCount, getLastTemperature, parseJSONBody } from "./utils";
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

const CONTAINER_MAILBOX = "mailbox";
const CONTAINER_TEMPERATURE = "temperature";
const CONTAINER_HUMIDITY = "humidity";

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
          send("=========ACME SMART MAILBOX=========\n");
          console.log("\n=========ACME SMART MAILBOX=========");
          send("Creating ACP...");
          send(await createACP(defaultConfig));

          send("Creating AE...");
          send(await createAE(defaultConfig));

          const ae_exists_smartmailbox = await checkAEExists(defaultConfig);
          if (!ae_exists_smartmailbox) {
            send("AE does not exist. Please create the AE first.");
            controller.close();
            return;
          }
          send("\nAE exists.\n");

          send("Creating containers...");
          const containerResultsSmartMailbox = await Promise.all([
            createContainer(CONTAINER_MAILBOX, defaultConfig),
            createContainer(CONTAINER_TEMPERATURE, defaultConfig),
            createContainer(CONTAINER_HUMIDITY, defaultConfig),
          ]);
          containerResultsSmartMailbox.forEach(send);

          send("\nCreating content instances...");
          const contentResultsSmartMailbox = await Promise.all([
            createContentInstance(CONTAINER_MAILBOX, "Novo pacote entregue às 13:00", defaultConfig),
            createContentInstance(CONTAINER_TEMPERATURE, "22.3", defaultConfig),
            createContentInstance(CONTAINER_HUMIDITY, "54", defaultConfig),
          ]);
          contentResultsSmartMailbox.forEach(send);
          console.log("\nOneM2M SmartMailbox setup completed.")
          send("\nOneM2M SmartMailbox setup completed.");

          send("\n=========ACME BUTLER=========\n");
          console.log("\n=========ACME BUTLER=========");

          send("Creating ACP...");
          send(await createACP(butlerConfig));

          send("Creating AE...");
          send(await createAE(butlerConfig));

          const ae_exists_butler = await checkAEExists(butlerConfig);
          if (!ae_exists_butler) {
            send("AE does not exist. Please create the AE first.");
            controller.close();
            return;
          }
          send("\nAE exists.\n");

          send("Creating containers...");
          const containerResultsButler = await Promise.all([
            createContainer(CONTAINER_MAILBOX, butlerConfig),
            createContainer(CONTAINER_TEMPERATURE, butlerConfig),
            createContainer(CONTAINER_HUMIDITY, butlerConfig),
          ]);
          containerResultsButler.forEach(send);

          send("\nCreating content instances...");
          const contentResultsButler = await Promise.all([
            createContentInstance(CONTAINER_MAILBOX, "Tens novo correio", butlerConfig),
            createContentInstance(CONTAINER_TEMPERATURE, "22.3", butlerConfig),
            createContentInstance(CONTAINER_HUMIDITY, "54", butlerConfig),
          ]);
          contentResultsButler.forEach(send);
          console.log("\nOneM2M Butler setup completed.")
          send("\nOneM2M Butler setup completed.");

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
      const temperature = await getLastHumidity(db);
      return json({ temperature });
    } catch {
      return json({ error: "Failed to fetch temperature data" }, 500);
    }
  }

  if (method === "POST" && pathname === "/mail") {
    try {
      const body = await parseJSONBody(req);
      if (body.mail !== true) return json({ message: "No mail received" });

      let contentResults = await Promise.all([
        createContentInstance(CONTAINER_MAILBOX, "Tens novo correio", defaultConfig),
        createContentInstance(CONTAINER_MAILBOX, "Novo pacote entregue às 13:00", butlerConfig),
      ]);

      const mailCollection = db.collection("mailbox");
      const newCount = (await getLastMailCount(db)) + 1;
      await mailCollection.insertOne({
        count: newCount,
        timestamp: new Date(),
      });

      notifyAllClients("new-mail", { count: newCount });

      return json({ message: "Mail event logged", acme: contentResults, count: newCount }, 201);
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

      const temperature = body.temperature;

      let contentResults = await Promise.all([
        createContentInstance(CONTAINER_TEMPERATURE, temperature, defaultConfig),
        createContentInstance(CONTAINER_TEMPERATURE, temperature, butlerConfig),
      ]);

      await db
        .collection("temperatures")
        .insertOne({ temperature: temperature, timestamp: new Date() });

      notifyAllClients("new-temperature", { temperature });

      return json({ message: "Temperature saved", acme: contentResults }, 201);
    } catch (err: any) {
      return json(
        { error: err.message || "Failed to handle /temperature request" },
        400
      );
    }
  }

  if (method === "GET" && pathname === "/humidity") {
    try {
      const humidity = await getLastTemperature(db);
      return json({ humidity });
    } catch {
      return json({ error: "Failed to fetch humidity data" }, 500);
    }
  }

  if (method === "POST" && pathname === "/humidity") {
    try {
      const body = await parseJSONBody(req);
      if (typeof body.humidity !== "number")
        throw new Error("Invalid humidity");

      const humidity = body.humidity;

      let contentResults = await Promise.all([
        createContentInstance(CONTAINER_HUMIDITY, humidity, defaultConfig),
        createContentInstance(CONTAINER_HUMIDITY, humidity, butlerConfig),
      ]);

      await db
        .collection("humidity")
        .insertOne({ humidity: humidity, timestamp: new Date() });

      return json({ message: "Humidity saved", acme: contentResults }, 201);
    } catch (err: any) {
      return json(
        { error: err.message || "Failed to handle /humidity request" },
        400
      );
    }
  }

  if (method === "POST" && pathname === "/reminderMail") {
    try {
      const body = await parseJSONBody(req);
      if (typeof body.message !== "string")
        throw new Error("Invalid message");

      const message = body.message;

      let contentResults = await Promise.all([
        createContentInstance(CONTAINER_MAILBOX, message, defaultConfig),
        createContentInstance(CONTAINER_MAILBOX, message, butlerConfig),
      ]);

      return json({ message: "Message saved", acme: contentResults }, 201);
    } catch (err: any) {
      return json(
        { error: err.message || "Failed to handle /humidity request" },
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
