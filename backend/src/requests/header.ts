export function generateHeader(originator: string, reqId: string, resource: number) {
    return {
      "Content-Type": `application/json;ty=${resource}`,
      "X-M2M-Origin": originator,
      "X-M2M-RI": reqId,
      "X-M2M-RVI": "3",
    };
  }
  