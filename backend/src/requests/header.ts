export function generateHeader(originator: string, reqId: string, ty: number) {
    return {
      "X-M2M-Origin": originator,
      "X-M2M-RI": reqId,
      "Content-Type": `application/json;ty=${ty}`,
      "X-M2M-RVI": "3",
    };
  }
  