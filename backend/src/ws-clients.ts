const wsClients = new Set<any>();

export function addClient(ws: any) {
  wsClients.add(ws);
}

export function removeClient(ws: any) {
  wsClients.delete(ws);
}

export function notifyAllClients(message: string) {
  for (const ws of wsClients) {
    try {
      if (ws.readyState === 1) {
        ws.send(message);
      }
    } catch (err) {
      console.error("Error sending WebSocket message:", err);
    }
  }
}
