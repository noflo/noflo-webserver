# @noflo/webserver

Web Server components for [NoFlo](https://noflojs.org)

This module provides NoFlo components for running HTTP servers and handling HTTP requests.

## Components

- `webserver/Server` — starts an HTTP server per received port, emitting a scoped request/response pair per incoming request
- `webserver/BodyParser` — parses JSON and urlencoded request bodies into `req.body` (via `body-parser`)
- `webserver/Query` — parses the request URL's query string into `req.query` (Web-standard `URL`/`URLSearchParams`)
- `webserver/WriteHead` — writes a status code and headers to the response
- `webserver/WriteResponse` — writes a string (or stream of strings) to the response
- `webserver/SendResponse` — ends the response

For practical needs, the higher-level [noflo-xpress](https://github.com/noflo/noflo-xpress) library is recommended.

## Usage

Components are discovered automatically by NoFlo 2.x on Node.js. Example in FBP:

```
WebServer(webserver/Server) LISTENING -> IN WriteHead
8080 -> LISTEN WebServer
WebServer REQUEST -> IN BodyParser OUT -> IN Query OUT -> IN WriteResponse
'Hello world!' -> STRING WriteResponse OUT -> IN SendResponse
```

## Development

Install dependencies and run the test suite:

```
npm ci
npm test
```
