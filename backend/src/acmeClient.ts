import { config } from "dotenv";
import { createACPBody } from "./requests/createACP";
import { createAEBody } from "./requests/createAE";
import { generateHeader } from "./requests/header";
import { createContainerBody } from "./requests/createContainer";

config();

const CREATE = 1;
const RETRIEVE = 2;
const UPDATE = 4;
const DELETE = 8;
const NOTIFY = 16;
const ALL = 63;

const CREATE_ACP = 1;
const CREATE_AE = 2;
const CREATE_CNT = 3;

const acme_url = process.env.ACME_URL;
const cse_id = process.env.CSE_ID;
const cse_name = process.env.CSE_NAME;
const originator = process.env.ORIGINATOR;

if (!acme_url || !cse_id || !cse_name || !originator) {
  throw new Error("ACME_URL, CSE_ID, CSE_NAME, and ORIGINATOR must be defined in the .env file");
}

const acp_name = "acpSmartMailbox";
const ae_name = "CSmartMailbox";


export async function createACP() {

    const req_id = `reqSmartMailbox_${Math.floor(100 + Math.random() * 900)}`;
    const requestBody = createACPBody(acp_name, ae_name, ALL); 
    const header = generateHeader(originator!, req_id, CREATE_ACP);

    try {
        const response = await fetch(`${acme_url}/~/${cse_id}/${cse_name}`, {
            method: "POST",
            headers: header,
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            return "\nACP created successfully";
        } else if (response.status == 409) {
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
    

export async function createAE() {

    const acp_ri = await getACPDetails();
    const req_id = `reqSmartMailbox_${Math.floor(100 + Math.random() * 900)}`;
    const requestBody = createAEBody(acp_ri, ae_name, acme_url+"/"); 
    const header = generateHeader(ae_name, req_id, CREATE_AE);

    try {
        const response = await fetch(`${acme_url}/~/${cse_id}/${cse_name}`, {
            method: "POST",
            headers: header,
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            return "\nAE Created successfully";
        }
        else if (response.status === 404) {
            return "\nACP not found - The specified ACP does not exist";
        } else {
            const resText = await response.text();
        
            if (resText.includes("Originator has already registered")) {
                return "\nAE already exists";
            }
        
            console.error("Error creating AE:", resText);
            throw new Error(`Error creating AE: ${resText}`);
        }
        
    } catch (error) {
        console.error("Network or other error:", error);
        throw error;
    }
}

export async function getACPDetails() {
    const req_id = `reqSmartMailbox_${Math.floor(100 + Math.random() * 900)}`;
    const header = generateHeader(originator!, req_id, 0);

    // SENAO HOUVER DELAY 1SEG = BUG INSANO
    await new Promise(res => setTimeout(res, 1000));

    try {
        const response = await fetch(`${acme_url}/~/${cse_id}/${cse_name}/${acp_name}`, {
            headers: header,
        });

        if (response.ok) {
            const data = await response.json() as { [key: string]: any };
            if (data["m2m:acp"]) {
                const acpRI = data["m2m:acp"].ri;
                return acpRI;
            } else {
                throw new Error("Unexpected response structure. 'm2m:acp' not found.");
            }
        } else {
            let errorText = await response.text();
            try {
                const errorData = JSON.parse(errorText);
                if (errorData["m2m:dbg"]) {
                    const errorMessage = errorData["m2m:dbg"];
                    throw new Error(errorMessage);
                }
            } catch {
                throw new Error("Failed to fetch ACP details. No debug message found.");
            }
        }

    } catch (error) {
        console.error("Network or other error:", error);
        throw error;
    }
}

export async function createContainer(cntName: string) {

    const ae_exists = await checkAEExists();
    if (!ae_exists) {
        throw new Error("AE does not exist. Please create the AE first.");
    }
    const req_id = `reqSmartMailbox_${Math.floor(100 + Math.random() * 900)}`;
    const requestBody = createContainerBody(cntName);
    const header = generateHeader(ae_name, req_id, CREATE_CNT);

    try {
        const response = await fetch(`${acme_url}/~/${cse_id}/${cse_name}/${ae_name}`, {
            method: "POST",
            headers: header,
            body: JSON.stringify(requestBody)
        });

        if (response.ok) {
            return `\nContainer ${cntName} created successfully`;
        } else if (response.status === 409) {
            return `\nContainer ${cntName} already exists`;
        } else {
            const resText = await response.text();
            console.error("Error creating Container:", resText);
            throw new Error(`Error creating Container: ${resText}`);
        }
        
    } catch (error) {
        console.error("Network or other error:", error);
        throw error;
    }
}

export async function createContentInstance(containerName: string, content: string) {
    const req_id = `reqContent_${Math.floor(100 + Math.random() * 900)}`;
    const resourceType = 4; // ty=4 = ContentInstance
    const headers = generateHeader(ae_name, req_id, resourceType);
  
    const body = {
      "m2m:cin": {
        "con": content,       // conteúdo principal
        "cnf": "text/plain:0" // tipo MIME
      }
    };
  
    try {
      const response = await fetch(`${acme_url}/~/${cse_id}/${cse_name}/${ae_name}/${containerName}`, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });
  
      if (response.ok) {
        return `\nContentInstance created in '${containerName}' with content: ${content}`;
      } else {
        const resText = await response.text();
        console.error("Error creating ContentInstance:", resText);
        throw new Error(`Failed to create ContentInstance: ${resText}`);
      }
  
    } catch (error) {
      console.error("Network or other error:", error);
      throw error;
    }
  }
  

export async function checkAEExists(): Promise<boolean> {
    const req_id = `reqSmartMailbox_${Math.floor(100 + Math.random() * 900)}`;
    const header = generateHeader(originator!, req_id, 0); // Operation 0 = RETRIEVE
  
    // Avoid timing bug with ACME server
    await new Promise(res => setTimeout(res, 1000));
  
    try {
      const response = await fetch(`${acme_url}/~/${cse_id}/${cse_name}/${ae_name}`, {
        headers: header,
      });
  
      if (response.ok) {
        const data = await response.json() as { [key: string]: any };
        if (data["m2m:ae"]) {
          return true;
        } else {
          throw new Error("Unexpected response: 'm2m:ae' not found.");
        }
      } else if (response.status === 404) {
        return false;
      } else {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          const debugMsg = errorData["m2m:dbg"] || "Unknown error";
          throw new Error(`Failed to fetch AE: ${debugMsg}`);
        } catch {
          throw new Error("Failed to fetch AE: No debug message found.");
        }
      }
  
    } catch (error) {
      console.error("Network or other error while checking AE existence:", error);
      throw error;
    }
  }
  