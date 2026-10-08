import assert from "node:assert/strict";
import { describe, it } from "node:test";
import * as noflo from "@noflo/noflo";
import { getComponent as getSendResponse } from "../components/SendResponse.js";
import { getComponent as getWriteHead } from "../components/WriteHead.js";
import { getComponent } from "../components/WriteResponse.js";

/**
 * Waits for the next IP on a socket matching the predicate.
 *
 * Attach the returned promise before sending any IPs: when the last
 * posted IP completes the component's preconditions, the activation
 * (including its output) can run synchronously inside the post call,
 * so listeners attached afterwards miss the packets.
 * @param {import("@noflo/noflo").internalSocket.InternalSocket} socket
 * @param {(ip: import("@noflo/noflo").IP) => boolean} predicate
 * @returns {Promise<import("@noflo/noflo").IP>}
 */
const waitUntil = (socket, predicate) =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Timed out waiting for IP"));
    }, 2000);
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

describe("WriteResponse component", () => {
  it("writes a single string to the response", async () => {
    const c = getComponent();
    const inSocket = noflo.internalSocket.createSocket();
    const stringSocket = noflo.internalSocket.createSocket();
    const outSocket = noflo.internalSocket.createSocket();
    c.inPorts.in.attach(inSocket);
    c.inPorts.string.attach(stringSocket);
    c.outPorts.out.attach(outSocket);
    /** @type {string[]} */
    const written = [];
    const request = {
      res: {
        /** @param {string} data */
        write: (data) => written.push(data),
      },
    };
    // Attach the wait before sending: the activation can complete
    // synchronously during the second post
    const outIp = waitUntil(outSocket, (ip) => ip.type === "data");

    try {
      stringSocket.post(new noflo.IP("data", "Hello, World!"));
      inSocket.post(new noflo.IP("data", request));
      const ip = await outIp;
      assert.equal(ip.data, request);
      assert.deepEqual(written, ["Hello, World!"]);
    } finally {
      await c.shutdown();
    }
  });

  it("concatenates a stream of strings into one write", async () => {
    const c = getComponent();
    const inSocket = noflo.internalSocket.createSocket();
    const stringSocket = noflo.internalSocket.createSocket();
    const outSocket = noflo.internalSocket.createSocket();
    c.inPorts.in.attach(inSocket);
    c.inPorts.string.attach(stringSocket);
    c.outPorts.out.attach(outSocket);
    /** @type {string[]} */
    const written = [];
    const request = {
      res: {
        /** @param {string} data */
        write: (data) => written.push(data),
      },
    };
    const outIp = waitUntil(outSocket, (ip) => ip.type === "data");

    try {
      stringSocket.post(new noflo.IP("openBracket", "content"));
      stringSocket.post(new noflo.IP("data", "Hello, "));
      stringSocket.post(new noflo.IP("data", "World!"));
      stringSocket.post(new noflo.IP("closeBracket", "content"));
      inSocket.post(new noflo.IP("data", request));
      await outIp;
      assert.deepEqual(written, ["Hello, World!"]);
    } finally {
      await c.shutdown();
    }
  });
});

describe("WriteHead component", () => {
  it("writes status and headers to the response", async () => {
    const c = getWriteHead();
    const inSocket = noflo.internalSocket.createSocket();
    const statusSocket = noflo.internalSocket.createSocket();
    const headersSocket = noflo.internalSocket.createSocket();
    const outSocket = noflo.internalSocket.createSocket();
    c.inPorts.in.attach(inSocket);
    c.inPorts.status.attach(statusSocket);
    c.inPorts.headers.attach(headersSocket);
    c.outPorts.out.attach(outSocket);
    /** @type {Array<[number, Object]>} */
    const written = [];
    const request = {
      res: {
        /**
         * @param {number} status
         * @param {Object} headers
         */
        writeHead: (status, headers) => written.push([status, headers]),
      },
    };
    const outIp = waitUntil(outSocket, (ip) => ip.type === "data");

    try {
      // Control port before firing ports
      headersSocket.post(new noflo.IP("data", { "content-type": "text/html" }));
      statusSocket.post(new noflo.IP("data", 404));
      inSocket.post(new noflo.IP("data", request));
      await outIp;
      assert.deepEqual(written, [[404, { "content-type": "text/html" }]]);
    } finally {
      await c.shutdown();
    }
  });

  it("routes writeHead failures to the error port", async () => {
    const c = getWriteHead();
    const inSocket = noflo.internalSocket.createSocket();
    const statusSocket = noflo.internalSocket.createSocket();
    const outSocket = noflo.internalSocket.createSocket();
    const errorSocket = noflo.internalSocket.createSocket();
    c.inPorts.in.attach(inSocket);
    c.inPorts.status.attach(statusSocket);
    c.outPorts.out.attach(outSocket);
    c.outPorts.error.attach(errorSocket);
    /** @type {Array<[number, Object]>} */
    const written = [];
    const request = {
      res: {
        /**
         * @param {number} status
         * @param {Object} headers
         */
        writeHead: (status, headers) => {
          if (status < 100 || status > 599) {
            throw new Error("Invalid status code");
          }
          written.push([status, headers]);
        },
      },
    };
    const errorIp = waitUntil(
      errorSocket,
      (ip) => ip.type === "data" || ip.type === "error",
    );

    try {
      statusSocket.post(new noflo.IP("data", 99999));
      inSocket.post(new noflo.IP("data", request));
      const ip = await errorIp;
      assert.ok(ip.data instanceof Error);
      assert.match(ip.data.message, /Invalid status code/);
      assert.deepEqual(written, []);
    } finally {
      await c.shutdown();
    }
  });
});

describe("SendResponse component", () => {
  it("ends the response", async () => {
    const c = getSendResponse();
    const inSocket = noflo.internalSocket.createSocket();
    c.inPorts.in.attach(inSocket);
    let ended = false;
    const request = {
      res: {
        end: () => {
          ended = true;
        },
      },
    };

    try {
      inSocket.post(new noflo.IP("data", request));
      // No out port on this component; a short wait is enough to observe
      // the res.end() call
      await new Promise((resolve) => setTimeout(resolve, 100));
      assert.equal(ended, true);
    } finally {
      await c.shutdown();
    }
  });
});
