import { Component } from "@noflo/noflo";

/**
 * Parses the query string of the incoming HTTP request and populates
 * `req.query` with it, replacing the removed `connect.query` middleware
 * with Web-standard `URL`/`URLSearchParams`.
 *
 * Repeated keys are collected into arrays; values stay strings.
 * @returns {import("@noflo/noflo").Component} The configured component
 */
export function getComponent() {
  const c = new Component({
    description:
      "This component parses the query string of the incoming HTTP request into req.query",
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
        description: "Request with parsed query in req.query",
      },
      error: {
        datatype: "object",
        description: "Malformed request URL",
      },
    },
  });

  c.process((input, output) => {
    if (!input.hasData("in")) {
      return;
    }
    const request = input.getData("in");
    let url;
    try {
      // The base is irrelevant; only the query string is read
      url = new URL(request.req.url, "http://localhost");
    } catch (err) {
      output.done(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    /** @type {Object<string, string | string[]>} */
    const query = {};
    for (const [key, value] of url.searchParams) {
      const existing = query[key];
      if (existing === undefined) {
        query[key] = value;
      } else if (Array.isArray(existing)) {
        existing.push(value);
      } else {
        query[key] = [existing, value];
      }
    }
    request.req.query = query;
    output.sendDone({ out: request });
  });

  return c;
}
