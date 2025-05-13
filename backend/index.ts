const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/") {
      return new Response("Olá, mundo!", { status: 200 });
    }

    return new Response("Página não encontrada", { status: 404 });
  },
});

console.log(`Servidor a correr em http://localhost:${server.port}`);
