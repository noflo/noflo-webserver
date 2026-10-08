import { Component } from "@noflo/noflo";

/**
 * Receives a request and a string (or a stream of strings) on the input
 * ports, writes them to the request's response, and forwards the request.
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  const c = new Component({
    description:
      "This component receives a request and a string on the input ports, writes that string to the request's response and forwards the request",
    inPorts: {
      in: {
        datatype: "object",
        description: "req/res pair of the HTTP request",
        required: true,
      },
      string: {
        datatype: "string",
        description:
          "Content to write to the response; a stream is concatenated",
      },
    },
    outPorts: {
      out: {
        datatype: "object",
        description: "Request with the content written to its response",
      },
    },
  });

  c.process((input, output) => {
    if (!input.hasData("in")) {
      return;
    }
    if (!input.hasStream("string")) {
      return;
    }
    const request = input.getData("in");
    let string = "";
    const stream = /** @type {import("@noflo/noflo").IP[]} */ (
      input.getStream("string")
    );
    for (const packet of stream) {
      if (packet.type !== "data") continue;
      string += packet.data;
    }
    request.res.write(string);
    output.sendDone({ out: request });
  });

  return c;
}
