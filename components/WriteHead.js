import { Component } from "@noflo/noflo";

/**
 * Given a status code and an object containing return headers,
 * calls `writeHead` on the incoming `res`.
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  const c = new Component({
    description:
      "Given a status code and an object containing return headers, call writeHead on incoming res",
    inPorts: {
      in: {
        datatype: "object",
        description: "req/res pair of the HTTP request",
        required: true,
      },
      status: {
        datatype: "int",
        description: "HTTP status code to send",
        required: true,
      },
      headers: {
        datatype: "object",
        description: "Response headers to write",
        control: true,
        default: {},
      },
    },
    outPorts: {
      out: {
        datatype: "object",
        description: "Request with response headers written",
      },
      error: {
        datatype: "object",
        description: "Invalid status code or headers",
      },
    },
  });

  c.process((input, output) => {
    if (!input.hasData("in", "status")) {
      return;
    }
    // Wait for an attached headers connection to deliver before firing,
    // so a late headers IIP is not missed
    if (input.attached("headers").length && !input.hasData("headers")) {
      return;
    }
    const request = input.getData("in");
    const status = input.getData("status");
    const headers = input.hasData("headers") ? input.getData("headers") : {};
    try {
      request.res.writeHead(status, headers);
    } catch (err) {
      output.done(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    output.sendDone({ out: request });
  });

  return c;
}
