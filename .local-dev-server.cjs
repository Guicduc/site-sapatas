const http = require("http");
const fs = require("fs");
const path = require("path");

const host = "127.0.0.1";
const port = 4173;
const root = path.join(__dirname, "site");

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml; charset=utf-8",
};

function sendFile(filePath, response) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream",
    });
    response.end(content);
  });
}

http
  .createServer((request, response) => {
    const requestPath = decodeURIComponent((request.url || "/").split("?")[0]);
    const relativePath =
      requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
    const filePath = path.join(root, relativePath);

    fs.stat(filePath, (error, stats) => {
      if (!error && stats.isDirectory()) {
        sendFile(path.join(filePath, "index.html"), response);
        return;
      }

      sendFile(filePath, response);
    });
  })
  .listen(port, host, () => {
    process.stdout.write(
      `Traço Base local server running at http://${host}:${port}\n`
    );
  });
