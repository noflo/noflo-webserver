# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Changed

- Package renamed to @noflo/webserver; the version resets to the 2.x generation (2.0.0-alpha.1) for the fresh package name. Component addressing is unchanged — library IDs derive identically from the scoped name, so component and graph names stay the same. The old noflo-webserver will be deprecated with a pointer once 2.x reaches stable

- Migrated to NoFlo 2.x: components now depend on `@noflo/noflo` ^2.0.0 instead of the unscoped `noflo` 1.x package
- Package is now plain ESM (`"type": "module"`) with no build step; supported runtime is Node.js >= 22; components also run under Deno and Bun
- **Breaking**: removed the `webserver/Profiler` component — the `connect.profiler` middleware it used was removed from connect years ago and the component has been broken since
- `webserver/BodyParser` now uses the `body-parser` package instead of the removed `connect.bodyParser` (which made the component broken since connect 3)
- `webserver/Query` now parses the query string with Web-standard `URL`/`URLSearchParams` instead of the removed `connect.query`; repeated keys are collected into arrays
- **Breaking**: `webserver/Server` no longer emits the raw `http.Server` object on a `server` outport
- `webserver/Server` now emits the OS-assigned port number on `listening` (previously it echoed the requested port, which made port 0 unusable)
- `webserver/Server` requests are emitted with per-request scopes using the Web-standard `crypto.randomUUID`; server state moved off the component instance into the component closure, and shutdown closes all servers in parallel

### Fixed

- `webserver/WriteResponse` now actually writes the incoming string or string stream to the response — the previous implementation iterated a string literal instead of the packet stream and always wrote an empty string
- `webserver/WriteHead` no longer crashes with a ReferenceError when the `headers` control port is used; invalid status codes and headers are now routed to the `error` outport
