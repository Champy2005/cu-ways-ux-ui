import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};
export async function serve(directory, port = 0, identity = "capture") {
  const base = path.resolve(directory);
  const server = http.createServer((req, res) => {
    try {
      if (req.url === "/__ui/identity") {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ identity }));
        return;
      }
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      const file = path.resolve(
        base,
        "." + (pathname === "/" ? "/index.html" : pathname),
      );
      if (
        !file.startsWith(base + path.sep) ||
        !fs.existsSync(file) ||
        !fs.statSync(file).isFile()
      ) {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      res.setHeader(
        "Content-Type",
        mime[path.extname(file)] ?? "application/octet-stream",
      );
      fs.createReadStream(file).pipe(res);
    } catch {
      res.writeHead(400);
      res.end("Invalid request");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
