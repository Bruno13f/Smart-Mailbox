import { config } from "dotenv";
import {
  createACP,
  createAE,
  createContainer,
  createContentInstance,
  checkAEExists,
  defaultConfig,
  butlerConfig,
  setupOneM2MApp,
  findVirtualButlerACME,
} from "./acmeClient";
import { parseJSONBody } from "./utils";
import { addClient, removeClient, notifyAllClients } from "./ws-clients";
import {
  getNotificationOpenAI,
  NotificationType,
  type NotificationContent,
} from "./services/openaiService";
config();

const websocketHandlers = {
  open: addClient,
  message(ws: any, message: any) {
    ws.send(
      `Echo: ${typeof message === "string" ? message : message.toString()}`
    );
  },
  close: removeClient,
};

export const CONTAINER_MAILBOX = "mailbox";
export const CONTAINER_TEMPERATURE = "temperature";
export const CONTAINER_HUMIDITY = "humidity";

async function generateAndSaveMailNotification(
  promptType: NotificationType,
  fallbackMessage: string
): Promise<{ message: string; contentResults: any[] }> {
  const notification = await getNotificationOpenAI(5, promptType);
  const message = notification
    ? `${notification.title} - ${notification.body}`
    : fallbackMessage;

  const contentResults = await Promise.all([
    createContentInstance(CONTAINER_MAILBOX, "Act as a Announcer, say what I tell you and nothing else, '" + message + "'", defaultConfig),
    createContentInstance(CONTAINER_MAILBOX, "Act as a Announcer, say what I tell you and nothing else, '" + message + "'", butlerConfig),
  ]);

  return { message, contentResults };
}

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

  if (method === "POST" && pathname === "/setupOneM2M") {
    const isEsp32 = req.headers.get("x-client-type") === "esp32";
    if (isEsp32) {
      // Run setup and collect logs in an array
      const logs: string[] = [];
      const send = (msg: string) => {
        console.log(msg);
        logs.push(msg);
      };
      try {
        const smartMailboxSuccess = await setupOneM2MApp(
          defaultConfig,
          "SMART MAILBOX",
          send
        );
        if (!smartMailboxSuccess) {
          return json({ logs, error: "Smart Mailbox setup failed" }, 500);
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
        
        let butlerFound = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          const butlerFound = await findVirtualButlerACME();
          console.warn(`findVirtualButlerACME attempt ${attempt} failed, retrying...`);
        }
        if (!butlerFound) {
          throw new Error("Could not find Virtual Butler ACME after 3 attempts");
        }
        
        await setupOneM2MApp(butlerConfig, "BUTLER", send);
        return json({ logs, success: true });
      } catch (err: any) {
        logs.push("Error: " + (err.message || "Failed to setup OneM2M"));
        return json({ logs, error: err.message }, 500);
      }
    }
    const stream = new ReadableStream({
      async start(controller) {
        const send = (msg: string) => {
          console.log(msg);
          controller.enqueue(msg + "\n");
        };

        try {
          // Set up Smart Mailbox
          const smartMailboxSuccess = await setupOneM2MApp(
            defaultConfig,
            "SMART MAILBOX",
            send
          );
          if (!smartMailboxSuccess) {
            controller.close();
            return;
          }

          let butlerFound = false;
          for (let attempt = 1; attempt <= 3; attempt++) {
            const result = await findVirtualButlerACME();
            if (butlerConfig.acme_url) {
              butlerFound = true;
              break;
            }
            console.warn(`findVirtualButlerACME attempt ${attempt} failed, retrying...`);
          }
          if (!butlerFound) {
            throw new Error("Could not find Virtual Butler ACME after 3 attempts");
          }

          // Add delay between setups to prevent server timeout issues
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Set up Butler
          await setupOneM2MApp(butlerConfig, "BUTLER", send);
        } catch (err: any) {
          send("Error: " + (err.message || "Failed to setup OneM2M"));
        }
        controller.close();
      },
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

  if (method === "POST" && pathname === "/mail") {
    try {
      const body = await parseJSONBody(req);
      if (body.mail !== true) return json({ message: "No mail received" });

      const { message, contentResults } = await generateAndSaveMailNotification(
        NotificationType.MAIL,
        "You've got new mail!"
      );

      const newCount = 1;
      notifyAllClients("new-mail", { count: newCount });

      return json(
        { message: "Mail event logged", acme: contentResults, count: 1 },
        201
      );
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
        createContentInstance(
          CONTAINER_TEMPERATURE,
          temperature,
          defaultConfig
        ),
        createContentInstance(CONTAINER_TEMPERATURE, temperature, butlerConfig),
      ]);

      notifyAllClients("new-temperature", { temperature });

      return json({ message: "Temperature saved", acme: contentResults }, 201);
    } catch (err: any) {
      return json(
        { error: err.message || "Failed to handle /temperature request" },
        400
      );
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

      notifyAllClients("new-humidity", { humidity });

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
      if (typeof body.flag !== "boolean") throw new Error("Invalid flag");

      const isMailboxFilled = body.flag;
      const promptType = isMailboxFilled
        ? NotificationType.STILL_MAIL
        : NotificationType.NO_MAIL;

      const fallbackMessage = isMailboxFilled
        ? "Reminder go check your mailbox!"
        : "Your mailbox is empty!";

      const { message, contentResults } = await generateAndSaveMailNotification(
        promptType,
        fallbackMessage
      );

      console.log("Generated reminder message:", message);

      return json({ message: "Message saved", acme: contentResults }, 201);
    } catch (err: any) {
      return json(
        { error: err.message || "Failed to handle /reminderMail request" },
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
