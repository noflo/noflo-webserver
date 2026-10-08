import { Component } from "@noflo/noflo";

/**
 * Receives a HTTP request (req, res, next) combination on input and runs
 * `res.end()`, sending the response to the user.
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  const c = new Component({
    description:
      "This component receives a HTTP request (req, res, next) combination on input, and runs res.end(), sending the response to the user",
    inPorts: {
      in: {
        datatype: "object",
        description: "req/res pair of the HTTP request",
        required: true,
      },
    },
  });

  c.process((input, output) => {
    if (!input.hasData("in")) {
      return;
    }
    const request = input.getData("in");
    request.res.end();
    output.done();
  });

  return c;
}
