import { createServer } from "node:http";

import { Component, IP } from "@noflo/noflo";

/**
 * Starts an HTTP server per received port number, emitting one scoped
 * request/resolution pair per incoming HTTP request.
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  const c = new Component({
    description:
      "This component receives a port and host, and initializes a HTTP server for that combination. It sends out a request/response pair for each HTTP request it receives",
    inPorts: {
      listen: {
        datatype: "int",
        description: "Port to listen on; triggers server startup",
        required: true,
      },
      close: {
        datatype: "int",
        description: "Port to shut down a listening server; triggers shutdown",
      },
    },
    outPorts: {
      request: {
        datatype: "object",
        description:
          "req/res pair for each HTTP request, one scope per request",
      },
      listening: {
        datatype: "int",
        description: "Assigned port number once the server is listening",
      },
      error: {
        datatype: "object",
      },
    },
  });

  /** @type {Map<number, { server: import("node:http").Server, context: { deactivated?: boolean, deactivate(): void } }>} */
  const servers = new Map();

  /**
   * @param {number} port
   * @returns {Promise<void>}
   */
  const closeServer = (port) =>
    new Promise((resolve, reject) => {
      const entry = servers.get(port);
      if (!entry) {
        resolve();
        return;
      }
      entry.server.close((err) => {
        servers.delete(port);
        // End the activation that started this server
        if (entry.context && !entry.context.deactivated) {
          entry.context.deactivate();
        }
        if (err) reject(err);
        else resolve();
      });
      // Don't let keep-alive connections stall shutdown
      entry.server.closeAllConnections();
    });

  c.tearDown = async () => {
    await Promise.all([...servers.keys()].map((port) => closeServer(port)));
  };

  c.process((input, output, context) => {
    if (input.hasData("close")) {
      const port = input.getData("close");
      closeServer(port)
        .then(() => output.done())
        .catch((err) => output.done(err));
      return;
    }
    if (!input.hasData("listen")) {
      return;
    }
    const port = input.getData("listen");
    if (servers.has(port)) {
      // Already listening on this port
      output.done();
      return;
    }
    const server = createServer();
    let failed = false;
    server.on("error", (err) => {
      failed = true;
      servers.delete(port);
      output.done(err instanceof Error ? err : new Error(String(err)));
    });
    server.listen(port, () => {
      if (failed) return;
      servers.set(port, { server, context });
      // Emit the assigned port, so port 0 (OS-assigned) is usable
      const address = /** @type {import("node:net").AddressInfo} */ (
        server.address()
      );
      output.send({ listening: address.port });
      // Keep this activation open for the lifetime of the server;
      // closeServer deactivates it when the server closes
      server.on("request", (req, res) => {
        c.outPorts.request.sendIP(
          new IP(
            "data",
            { req, res, port: address.port },
            {
              scope: crypto.randomUUID(),
            },
          ),
        );
      });
    });
  });

  return c;
}
