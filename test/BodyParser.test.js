import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { describe, it } from "node:test";
import * as noflo from "@noflo/noflo";

import { getComponent } from "../components/BodyParser.js";

/**
 * Waits for the next IP on a socket matching the predicate.
 * @param {import("@noflo/noflo").internalSocket.InternalSocket} socket
 * @param {(ip: import("@noflo/noflo").IP) => boolean} predicate
 * @returns {Promise<import("@noflo/noflo").IP>}
 */
const waitUntil = (socket, predicate) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for IP"));
    }, 5000);
    /** @param {CustomEvent} event */
    const listener = (event) => {
      const ip = event.detail;
      if (predicate(ip)) {
        cleanup();
        resolve(ip);
      }
    };
    const cleanup = () => {
      clearTimeout(timer);
      socket.removeEventListener("ip", listener);
    };
    socket.addEventListener("ip", listener);
  });

describe("BodyParser component", () => {
  /**
   * The component only parses; the test owns the response lifecycle
   * @param {import("@noflo/noflo").internalSocket.InternalSocket} inSocket
   */
  const startServer = async (inSocket) => {
    /** @type {{ req: import("http").IncomingMessage, res: import("http").ServerResponse }[]} */
    const received = [];
    const server = createServer((req, res) => {
      const pair = { req, res };
      received.push(pair);
      inSocket.post(new noflo.IP("data", pair));
    });
    server.listen({ port: 0, host: "127.0.0.1" });
    await once(server, "listening");
    const address = /** @type {import("node:net").AddressInfo} */ (
      server.address()
    );
    return { server, address, received };
  };

  /**
   * @param {import("node:http").Server} server
   * @returns {Promise<void>}
   */
  const closeServer = async (server) => {
    server.closeAllConnections();
    server.close();
    await once(server, "close");
  };

  it("parses a JSON request body into req.body", async () => {
    const c = getComponent();
    const inSocket = noflo.internalSocket.createSocket();
    const outSocket = noflo.internalSocket.createSocket();
    const errorSocket = noflo.internalSocket.createSocket();
    c.inPorts.in.attach(inSocket);
    c.outPorts.out.attach(outSocket);
    c.outPorts.error.attach(errorSocket);

    const { server, address } = await startServer(inSocket);

    try {
      const outIp = waitUntil(outSocket, (ip) => ip.type === "data");
      const fetchPromise = fetch(`http://127.0.0.1:${address.port}/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hello: "world" }),
        signal: AbortSignal.timeout(4000),
      }).then(
        (res) => res.status,
        (err) => String(err),
      );
      const ip = await outIp;
      assert.deepEqual(ip.data.req.body, { hello: "world" });
      ip.data.res.end();
      assert.equal(await fetchPromise, 200);
    } finally {
      await closeServer(server);
      await c.shutdown();
    }
  });

  it("routes body parsing failures to the error port", async () => {
    const c = getComponent();
    const inSocket = noflo.internalSocket.createSocket();
    const outSocket = noflo.internalSocket.createSocket();
    const errorSocket = noflo.internalSocket.createSocket();
    c.inPorts.in.attach(inSocket);
    c.outPorts.out.attach(outSocket);
    c.outPorts.error.attach(errorSocket);

    const { server, address, received } = await startServer(inSocket);

    try {
      const errorIp = waitUntil(
        errorSocket,
        (ip) => ip.type === "data" || ip.type === "error",
      );
      const fetchPromise = fetch(`http://127.0.0.1:${address.port}/`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{invalid json",
        signal: AbortSignal.timeout(4000),
      }).catch((err) => String(err));
      const ip = await errorIp;
      assert.ok(ip.data instanceof Error);
      // Release the hanging HTTP request
      received[0].res.end();
      await fetchPromise;
    } finally {
      await closeServer(server);
      await c.shutdown();
    }
  });
});
