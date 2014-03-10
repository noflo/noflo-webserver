noflo = require "noflo"
http = require "http"
uuid = require "node-uuid"

class Server extends noflo.Component
  description: "This component receives a port and host, and initializes
a HTTP server for that combination. It sends out a request/response pair
for each HTTP request it receives"

  constructor: ->
    @servers = {}
    @connections = {}
    @inPorts =
      listen: new noflo.Port 'int'
      close: new noflo.Port 'int'
    @outPorts =
      request: new noflo.Port 'object'
      server: new noflo.Port 'object'
      listening: new noflo.Port 'int'
      error: new noflo.Port 'object'

    @inPorts.listen.on "data", (data) =>
      @createServer data

    @inPorts.close.on 'data', (data) =>
      return unless @servers[data]
  
      # Stop accepting requests
      @servers[data].close =>
        @handleClosed data

      # Close connections
      return unless @connections[@servers[data]]
      socket.destroy() for socket in @connections[data]

  createServer: (port) ->
    server = new http.Server
    # Pass the server forward if we have the server port attached
    if @outPorts.server.isAttached()
      @outPorts.server.beginGroup port
      @outPorts.server.send server
      @outPorts.server.endGroup()
      @outPorts.server.disconnect()

    # Keep track of connections to be able to shut down when needed
    @connections[port] = []
    server.on 'connection', (socket) =>
      @connections[port].push socket
      socket.on 'close', =>
        return unless @connections[port]
        @connections[port].splice @connections[port].indexOf(socket), 1

    # Handle new requests
    server.on 'request', (req, res) =>
      @sendRequest req, res, port

    # Handle server being closed
    server.on 'close', =>
      @handleClosed port

    # Start listening at the designated ports
    server.listen port, (err) =>
      # Report port binding error
      if err
        unless @outPorts.error.isAttached()
          throw err
        @outPorts.error.send err
        @outPorts.error.disconnect()
        return
      # Register the server to the component instance
      @servers[port] = server
      # Connect the request port, as we will have HTTP requests coming through
      @outPorts.request.connect()
      # Report that we're listening
      if @outPorts.listening.isAttached()
        @outPorts.listening.send port

  sendRequest: (req, res, port) =>
    # Group requests by port number
    @outPorts.request.beginGroup port
    # All request/response pairs are coupled with a UUID group so they
    # can be merged back together for writing the response later.
    @outPorts.request.beginGroup uuid()
    @outPorts.request.send
      req: req
      res: res
    @outPorts.request.endGroup()
    @outPorts.request.endGroup()
    # End of request
    @outPorts.request.disconnect()

  handleClosed: (port) =>
    return unless @servers[port]
    delete @servers[port]
    delete @connections[port]
    # No more requests to send as the server has closed
    @outPorts.request.disconnect()
    # We've also stopped listening to the port
    if @outPorts.listening.isAttached()
      @outPorts.listening.disconnect()

  shutdown: ->
    Object.keys(@servers).forEach (port) =>
      # Stop accepting requests
      @servers[port].close =>
        @handleClosed port

      # Close connections
      return unless @connections[@servers[port]]
      socket.destroy() for socket in @connections[@servers[port]]

exports.getComponent = -> new Server
