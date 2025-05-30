export function generateHeader(originator: string, reqId: string, resource: number) {
  return {
    "Content-Type": resource === 0 ? "application/json" : `application/json;ty=${resource}`,
    "X-M2M-Origin": originator,
    "X-M2M-RI": reqId,
    "X-M2M-RVI": "3",
  };
}
