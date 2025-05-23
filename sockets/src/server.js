const WebSocket = require("ws");
const server = new WebSocket.Server({ port: 8080 });

server.on("connection", (socket) => {
  console.log("Cliente conectado.");

  socket.on("message", (message) => {
    console.log(`Mensagem recebida: ${message}`);
    socket.send(`Echo: ${message}`);
  });

  socket.on("close", () => {
    console.log("Cliente desconectado.");
  });
});
