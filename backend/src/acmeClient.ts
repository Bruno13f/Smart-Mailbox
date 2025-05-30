import { config } from "dotenv";
import { createACPBody } from "./requests/createACP";
import { generateHeader } from "./requests/header";

config();

const CREATE = 1;
const RETRIEVE = 2;
const UPDATE = 4;
const DELETE = 8;
const NOTIFY = 16;
const ALL = 63;

const CREATE_ACP = 1;
const CREATE_AE = 2;

const acme_url = process.env.ACME_URL;
const cse_id = process.env.CSE_ID;
const cse_name = process.env.CSE_NAME;
const originator = process.env.ORIGINATOR;

if (!acme_url || !cse_id || !cse_name || !originator) {
  throw new Error("ACME_URL, CSE_ID, CSE_NAME, and ORIGINATOR must be defined in the .env file");
}

const acp_name = "acpSmartMailbox";
const ae_name = "CSmartMailbox";
const req_id = `reqSmartMailbox_${Math.floor(100 + Math.random() * 900)}`;

export async function createACP() {
    const requestBody = createACPBody(acp_name, ae_name, ALL); 
    const header = generateHeader(originator!, req_id, CREATE_ACP);

    try {
        const response = await fetch(`${acme_url}/~/${cse_id}/${cse_name}`, {
            method: "POST",
            headers: header,
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            return "\nACP Created successfully";
        } else if (response.status === 409) {
            return "\nACP already exists";
        } else {
            const resText = await response.text();
            console.error("Error creating ACP:", resText);
            throw new Error(`Error creating ACP: ${resText}`);
        }
    } catch (error) {
        console.error("Network or other error:", error);
        throw error;
    }
}