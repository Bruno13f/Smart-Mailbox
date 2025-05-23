import { MongoClient } from "mongodb";
import { config } from "dotenv";

config();

const mongoUrl = process.env.MONGO_URL;

if (!mongoUrl) {
  throw new Error("MONGO_URL is not defined in the .env file");
}

const client = new MongoClient(mongoUrl);

export async function connectToDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    return client.db("smart-mailbox");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    throw err;
  }
}
