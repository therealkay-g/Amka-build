const next = require("next");
const http = require("http");
const dir = "C:\\Users\\USER\\Music\\amka\\amka-build\\amka-build\\release_v4\\win-unpacked\\resources\\app.asar.unpacked";
const app = next({ dev: false, dir });
const handle = app.getRequestHandler();
app.prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      handle(req, res).catch((err) => console.error("HANDLER ERROR:", err));
    });
    server.listen(3200, "127.0.0.1", () => console.log("LISTENING 3200"));
  })
  .catch((e) => {
    console.error("PREPARE ERROR:", e);
    process.exit(1);
  });
