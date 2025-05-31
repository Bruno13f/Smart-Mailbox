export function createCIN(content: string) {
  return {
    "m2m:cin": {
      con: content,
      cnf: "text/plain:0",
      lbl: [new Date().toISOString()], // metadado opcional para ajudar a não ser considerado duplicado
    },
  };
}
