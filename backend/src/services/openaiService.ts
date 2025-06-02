import openai from "../config/openai.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface NotificationContent {
  title: string;
  body: string;
}

export enum NotificationType {
  MAIL = "mail",
  NO_MAIL = "no-mail",
  STILL_MAIL = "still-mail",
}

// Map of prompt types to their corresponding files
const promptFiles = {
  [NotificationType.MAIL]: "promptGenerateMailNotification.txt",
  [NotificationType.NO_MAIL]: "promptGenerateMailboxEmptyNotification.txt",
  [NotificationType.STILL_MAIL]: "promptGenerateMailReminderNotification.txt",
};

async function generateMessageOpenAI(
  promptType: NotificationType = NotificationType.MAIL
): Promise<string | null> {
  const promptFilePath = path.resolve(
    __dirname,
    "../prompts/",
    promptFiles[promptType]
  );

  try {
    const prompt = fs.readFileSync(promptFilePath, "utf-8");

    if (!prompt) {
      console.error(`Failed to read prompt file for ${promptType}`);
      return null;
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    return completion.choices[0]?.message.content || null;
  } catch (error) {
    console.error(`Error reading prompt file for ${promptType}:`, error);
    return null;
  }
}

export async function getNotificationOpenAI(
  maxRetries = 5,
  promptType: NotificationType = NotificationType.MAIL
): Promise<NotificationContent | null> {
  for (let tries = 0; tries < maxRetries; tries++) {
    const message = await generateMessageOpenAI(promptType);
    const parsedContent = parseJsonFromMessage(message);

    if (!parsedContent) {
      console.warn(
        `Retrying (${tries + 1}/${maxRetries}) to get valid JSON from OpenAI`
      );
      continue;
    }

    console.log("Title:", parsedContent.title);
    console.log("Body:", parsedContent.body);
    return parsedContent;
  }

  console.error(
    "Failed to get notification from OpenAI after multiple attempts"
  );
  return null; // Return null or handle error as needed
}

// Helper function to parse JSON content
function parseJsonFromMessage(
  message: string | null
): NotificationContent | null {
  if (!message) {
    console.error("Received null or empty message from OpenAI");
    return null;
  }

  const jsonMatch = message.match(/{[\s\S]*}/);

  if (!jsonMatch) return null;

  try {
    const jsonString = jsonMatch[0];
    console.log("JSON String:", jsonString);
    return JSON.parse(jsonString) as NotificationContent;
  } catch (error) {
    console.error("Error parsing JSON from message:", error);
    return null;
  }
}
