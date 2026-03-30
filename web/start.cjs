#!/usr/bin/env node
// Starts Vite dev server on port 5000, then proxies port 8081 -> 5000
// Port 8081 is what Replit's external port 80 routes to
const { spawn } = require("child_process");
const http = require("http");
const net = require("net");

const VITE_PORT = 5000;
const PROXY_PORT = 8081;

// Start Vite
const vite = spawn(
  "node_modules/.bin/vite",
  [],
  { stdio: "inherit", cwd: __dirname }
);

vite.on("error", (err) => {
  console.error("Vite error:", err);
  process.exit(1);
});

// Wait for Vite to be ready, then start proxy
function waitForVite(retries) {
  if (retries === undefined) retries = 30;
  const req = http.get("http://localhost:" + VITE_PORT + "/", function(res) {
    res.resume();
    startProxy();
  });
  req.on("error", function() {
    if (retries > 0) {
      setTimeout(function() { waitForVite(retries - 1); }, 1000);
    } else {
      console.error("Vite did not start in time");
      process.exit(1);
    }
  });
  req.end();
}

function startProxy() {
  var proxy = http.createServer(function(req, res) {
    var options = {
      hostname: "localhost",
      port: VITE_PORT,
      path: req.url,
      method: req.method,
      headers: Object.assign({}, req.headers, { host: "localhost:" + VITE_PORT }),
    };
    var upstream = http.request(options, function(upRes) {
      res.writeHead(upRes.statusCode, upRes.headers);
      upRes.pipe(res);
    });
    upstream.on("error", function() {
      try { res.writeHead(502); res.end("proxy error"); } catch(e) {}
    });
    req.pipe(upstream);
  });

  // WebSocket proxy for Vite HMR
  proxy.on("upgrade", function(req, socket, head) {
    var upSocket = net.connect(VITE_PORT, "localhost");
    upSocket.on("connect", function() {
      var headerLines = [
        req.method + " " + req.url + " HTTP/1.1",
        "Host: localhost:" + VITE_PORT,
        "Upgrade: websocket",
        "Connection: Upgrade",
      ];
      Object.keys(req.headers).forEach(function(k) {
        if (k !== "host" && k !== "upgrade" && k !== "connection") {
          headerLines.push(k + ": " + req.headers[k]);
        }
      });
      headerLines.push("", "");
      upSocket.write(headerLines.join("\r\n"));
      if (head && head.length) upSocket.write(head);
      upSocket.pipe(socket);
      socket.pipe(upSocket);
    });
    upSocket.on("error", function() { socket.destroy(); });
    socket.on("error", function() { upSocket.destroy(); });
  });

  proxy.listen(PROXY_PORT, "0.0.0.0", function() {
    console.log("Proxy ready: port " + PROXY_PORT + " -> " + VITE_PORT);
  });

  proxy.on("error", function(err) {
    console.error("Proxy error:", err.message);
  });
}

process.on("SIGTERM", function() { vite.kill(); process.exit(0); });
process.on("SIGINT", function() { vite.kill(); process.exit(0); });

waitForVite();
