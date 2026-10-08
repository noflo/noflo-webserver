import { Component } from "@noflo/noflo";
import bodyParser from "body-parser";

/**
 * Applies body parsing to the incoming HTTP request, populating
 * `req.body` for JSON and urlencoded payloads.
 *
 * Replaces the removed `connect.bodyParser` middleware with the
 * `body-parser` package (JSON + urlencoded, matching the original
 * behavior; multipart was never included).
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  const jsonParser = bodyParser.json();
  const urlParser = bodyParser.urlencoded({ extended: true });

  const c = new Component({
    description: "This applies body parsing middleware to the incoming request",
    inPorts: {
      in: {
        datatype: "object",
        description: "req/res pair of the HTTP request",
        required: true,
      },
    },
    outPorts: {
      out: {
        datatype: "object",
        description: "Request with parsed body in req.body",
      },
      error: {
        datatype: "object",
        description: "Body parsing errors",
      },
    },
  });

  /**
   * @param {(req: import("http").IncomingMessage, res: import("http").ServerResponse, next: (err?: unknown) => void) => void} middleware
   * @param {{ req: import("http").IncomingMessage, res: import("http").ServerResponse }} request
   * @returns {Promise<void>}
   */
  const apply = (middleware, request) =>
    new Promise((resolve, reject) => {
      middleware(request.req, request.res, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

  c.process((input) => {
    if (!input.hasData("in")) {
      return;
    }
    const request = input.getData("in");
    // Promise-pure style: resolution becomes an implicit sendDone
    return apply(jsonParser, request)
      .then(() => apply(urlParser, request))
      .then(() => ({ out: request }));
  });

  return c;
}
