import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as noflo from "@noflo/noflo";

import { getComponent } from "../components/Server.js";

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

describe("Server component", () => {
  it("emits a scoped request pair per HTTP request on an OS-assigned port", async () => {
    const c = getComponent();
    const listen = noflo.internalSocket.createSocket();
    const close = noflo.internalSocket.createSocket();
    const request = noflo.internalSocket.createSocket();
    const listening = noflo.internalSocket.createSocket();
    const error = noflo.internalSocket.createSocket();
    c.inPorts.listen.attach(listen);
    c.inPorts.close.attach(close);
    c.outPorts.request.attach(request);
    c.outPorts.listening.attach(listening);
    c.outPorts.error.attach(error);

    try {
      listen.post(new noflo.IP("data", 0)); // port 0 = OS-assigned, test-safe
      const listeningIp = await waitUntil(
        listening,
        (ip) => ip.type === "data",
      );
      const port = listeningIp.data;
      assert.equal(typeof port, "number");
      assert.ok(port > 0, "should report the OS-assigned port, not 0");

      // Two requests must produce two scoped, respondable request pairs
      const scopes = [];
      const statuses = [];
      for (let i = 0; i < 2; i++) {
        const fetchPromise = fetch(`http://127.0.0.1:${port}/`, {
          signal: AbortSignal.timeout(3000),
        }).then((res) => res.status);
        const ip = await waitUntil(
          request,
          (candidate) =>
            candidate.type === "data" || candidate.type === "error",
        );
        assert.equal(ip.type, "data");
        assert.equal(ip.data.port, port);
        assert.ok(ip.data.req);
        assert.ok(ip.data.res);
        scopes.push(ip.scope);
        ip.data.res.end();
        statuses.push(await fetchPromise);
      }
      assert.deepEqual(statuses, [200, 200]);
      assert.ok(
        scopes.every((scope) => typeof scope === "string" && scope.length > 0),
        "each request should carry a scope",
      );
      assert.notEqual(scopes[0], scopes[1], "scopes must be per-request");

      // Shut the server down via the close port
      close.post(new noflo.IP("data", port));
      await c.shutdown();
      await assert.rejects(() =>
        fetch(`http://127.0.0.1:${port}/`, {
          signal: AbortSignal.timeout(1000),
        }),
      );
    } finally {
      // Must close all servers via tearDown, also on assertion failure —
      // a leaked server keeps the test process alive forever
      await c.shutdown();
    }
  });
});
