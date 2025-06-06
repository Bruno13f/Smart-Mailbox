import { config } from "dotenv";
import { createACPBody } from "./requests/createACP";
import { createAEBody } from "./requests/createAE";
import { generateHeader } from "./requests/header";
import { createContainerBody } from "./requests/createContainer";
import { createCIN } from "./requests/createCIN";
import { fetchWithRetry } from "./utils";
import { execSync } from "child_process";
import {
  CONTAINER_HUMIDITY,
  CONTAINER_MAILBOX,
  CONTAINER_TEMPERATURE,
} from ".";

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
const CREATE_CIN = 4;

export interface AcmeConfig {
  acme_url: string;
  cse_id: string;
  cse_name: string;
  originator: string;
  acp_name: string;
  ae_name: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const defaultConfig: AcmeConfig = {
  acme_url: requireEnv("ACME_URL"),
  cse_id: requireEnv("CSE_ID"),
  cse_name: requireEnv("CSE_NAME"),
  originator: requireEnv("ORIGINATOR"),
  acp_name: "acpSmartMailbox",
  ae_name: "CSmartMailbox",
};

export const butlerConfig: AcmeConfig = {
  acme_url: "",
  cse_id: requireEnv("BUTLER_CSE_ID"),
  cse_name: requireEnv("BUTLER_CSE_NAME"),
  originator: requireEnv("BUTLER_ORIGINATOR"),
  acp_name: "acpSmartMailboxButler",
  ae_name: "CSmartMailboxButler",
};

export async function findVirtualButlerACME() {
  try {
    const myip = execSync(
      `ip route get 1.1.1.1 | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}'`
    )
      .toString()
      .trim();

    const cmd = `
      nmap -p 8080 --open 192.168.1.0/24 | \
      awk '/Nmap scan report/{gsub(/[()]/,"",$NF); ip=$NF} /8080\\/tcp open/{print ip}' | \
      grep -v ${myip} | paste -sd ';' -
    `;
    const result = execSync(cmd, { shell: "/bin/bash" }).toString().trim();

    const ips = result.split(";").map(ip => ip.trim()).filter(ip => ip);

    for (const ip of ips) {
      const baseURL = `http://${ip}:8080`;
      try {
        const found = await findAE(baseURL);
        if (found) {
          butlerConfig.acme_url = baseURL;
        }
      } catch (err) {
        // Ignore errors for unreachable IPs
      }
    }

  } catch (err) {
    console.error("Error finding Virtual Butler ACME IP:", err);
  }
}

export async function findAE(baseURL: string){

  const req_id = `reqSmartMailbox_${Math.floor(100 + Math.random() * 900)}`;
  const header = generateHeader(butlerConfig.originator!, req_id, 0);

  try {
    const response = await fetch(
      `${baseURL}/~/${butlerConfig.cse_id}/${butlerConfig.cse_name}/Butler`,
      {
        headers: header,
      }
    );

    if (response.ok) {
      return true; //found
    } else {
      return false; //not found
    }
  } catch (error) {
    console.error("Network or other error:", error);
    throw error;
  }

}

// Helper function to set up a OneM2M application
export async function setupOneM2MApp(
  config: any,
  appName: string,
  send: (msg: string) => void
): Promise<boolean> {
  send(`\n=========ACME ${appName}=========\n`);

  send("Creating ACP...");
  send(await createACP(config));

  send("Creating AE...");
  send(await createAE(config));

  const ae_exists = await checkAEExists(config);
  if (!ae_exists) {
    send(`AE does not exist. Please create the AE first.`);
    return false;
  }
  send("\nAE exists.\n");

  send("Creating containers...");
  const containerResults = await Promise.all([
    createContainer(CONTAINER_MAILBOX, config),
    createContainer(CONTAINER_TEMPERATURE, config),
    createContainer(CONTAINER_HUMIDITY, config),
  ]);
  containerResults.forEach(send);

  send(`\nOneM2M ${appName} setup completed.`);
  return true;
}

export async function createACP(config: AcmeConfig) {
  const req_id = `reqSmartMailbox_${Math.floor(100 + Math.random() * 900)}`;
  const requestBody = createACPBody(config.acp_name, config.ae_name, ALL);
  const header = generateHeader(config.originator, req_id, CREATE_ACP);

  try {
    const response = await fetch(
      `${config.acme_url}/~/${config.cse_id}/${config.cse_name}`,
      {
        method: "POST",
        headers: header,
        body: JSON.stringify(requestBody),
      }
    );

    if (response.ok) {
      console.log("\nACP created Successfully");
      return "ACP created successfully\n";
    } else if (response.status == 409) {
      console.log("\nACP already exists");
      return "ACP already exists\n";
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

export async function createAE(config: AcmeConfig) {
  // ao obter detalhes ACP verifica se esta existe
  const acp_ri = await getACPDetails(config);
  const req_id = `reqSmartMailbox_${Math.floor(100 + Math.random() * 900)}`;
  const requestBody = createAEBody(
    acp_ri,
    config.ae_name,
    config.acme_url + "/"
  );
  const header = generateHeader(config.ae_name, req_id, CREATE_AE);

  try {
    const response = await fetch(
      `${config.acme_url}/~/${config.cse_id}/${config.cse_name}`,
      {
        method: "POST",
        headers: header,
        body: JSON.stringify(requestBody),
      }
    );

    if (response.ok) {
      console.log("\nAE created Successfully\n");
      return "AE created successfully";
    } else if (response.status === 404) {
      console.log("\nACP not found\n");
      return "ACP not found";
    } else {
      const resText = await response.text();

      if (resText.includes("Originator has already registered")) {
        console.log("\nAE already exists");
        return "AE already exists";
      }

      console.error("Error creating AE:", resText);
      throw new Error(`Error creating AE: ${resText}`);
    }
  } catch (error) {
    console.error("Network or other error:", error);
    throw error;
  }
}

export async function getACPDetails(config: AcmeConfig) {
  const req_id = `reqSmartMailbox_${Math.floor(100 + Math.random() * 900)}`;
  const header = generateHeader(config.originator!, req_id, 0);

  // SENAO HOUVER DELAY 1SEG = BUG INSANO
  await new Promise((res) => setTimeout(res, 100));

  try {
    const response = await fetch(
      `${config.acme_url}/~/${config.cse_id}/${config.cse_name}/${config.acp_name}`,
      {
        headers: header,
      }
    );

    if (response.ok) {
      const data = (await response.json()) as { [key: string]: any };
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

export async function createContainer(cntName: string, config: AcmeConfig) {
  const req_id = `reqSmartMailbox_${Math.floor(100 + Math.random() * 900)}`;
  const requestBody = createContainerBody(cntName);
  const header = generateHeader(config.ae_name, req_id, CREATE_CNT);

  try {
    const response = await fetch(
      `${config.acme_url}/~/${config.cse_id}/${config.cse_name}/${config.ae_name}`,
      {
        method: "POST",
        headers: header,
        body: JSON.stringify(requestBody),
      }
    );

    if (response.ok) {
      console.log(`Container ${cntName} created successfully`);
      return `Container ${cntName} created successfully`;
    } else if (response.status === 409) {
      console.log(`\nContainer ${cntName} already exists`);
      return `Container ${cntName} already exists`;
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

export async function createContentInstance(
  containerName: string,
  content: string,
  config: AcmeConfig
) {
  const req_id = `reqContent_${Math.floor(100 + Math.random() * 900)}`;
  const header = generateHeader(config.ae_name, req_id, CREATE_CIN);
  const requestBody = createCIN(content);

  try {
    const response = await fetchWithRetry(
      `${config.acme_url}/~/${config.cse_id}/${config.cse_name}/${config.ae_name}/${containerName}`,
      {
        method: "POST",
        headers: header,
        body: JSON.stringify(requestBody),
      }
    );

    const resText = await response.text();

    if (response.ok) {
      console.log(
        `ContentInstance created in '${containerName}' with content: ${content}`
      );
      return `ContentInstance created in '${containerName}' with content: ${content}`;
    } else {
      console.error("Error creating ContentInstance:", resText);
      throw new Error(`Failed to create ContentInstance: ${resText}`);
    }
  } catch (error) {
    console.error("Network or other error:", error);
    throw error;
  }
}

export async function checkAEExists(config: AcmeConfig): Promise<boolean> {
  const req_id = `reqSmartMailbox_${Math.floor(100 + Math.random() * 900)}`;
  const header = generateHeader(config.originator!, req_id, 0); // Operation 0 = RETRIEVE

  // Avoid timing bug with ACME server
  await new Promise((res) => setTimeout(res, 100));

  try {
    const response = await fetch(
      `${config.acme_url}/~/${config.cse_id}/${config.cse_name}/${config.ae_name}`,
      {
        headers: header,
      }
    );

    if (response.ok) {
      const data = (await response.json()) as { [key: string]: any };
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
