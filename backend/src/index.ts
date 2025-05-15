const server = Bun.serve({
  port: Number(process.env.PORT) || 3000,
  fetch(req) {
    const url = new URL(req.url);

    // GET
    if (req.method === "GET" && url.pathname === "/") {
      return new Response("Olá, mundo!", { status: 200 });
    }

    // POST
    if (req.method === "POST" && url.pathname === "/cartas") {
      return new Response("Cartas no correio", { status: 200 });
    }

    return new Response("Página não encontrada", { status: 404 });
  },
});

console.log(`Servidor a correr em http://localhost:${server.port}`);
