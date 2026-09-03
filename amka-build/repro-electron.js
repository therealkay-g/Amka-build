const { app } = require("electron");
const path = require("path");
const http = require("http");

const asarDir = "C:\\Users\\USER\\Music\\amka\\amka-build\\amka-build\\release_v4\\win-unpacked\\resources";
const next = require(path.join(asarDir, "app.asar", "node_modules", "next"));
const unpackedDir = path.join(asarDir, "app.asar.unpacked");

app.whenReady().then(async () => {
  try {
    const nextApp = next({ dev: false, dir: unpackedDir });
    const handle = nextApp.getRequestHandler();
    await nextApp.prepare();
    const server = http.createServer((req, res) => {
      handle(req, res).catch((err) => console.error("HANDLER ERROR:", err));
    });
    server.listen(3210, "127.0.0.1", () => console.log("LISTENING 3210"));
  } catch (e) {
    console.error("PREPARE ERROR:", e);
    app.exit(1);
  }
});
