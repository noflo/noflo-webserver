noflo = require "noflo"
http = require "http"
uuid = require "uuid"

# @runtime noflo-nodejs

exports.getComponent = ->
  c = new noflo.Component
  c.description = "This component receives a port and host, and initializes
a HTTP server for that combination. It sends out a request/response pair
for each HTTP request it receives"
  c.inPorts.add 'listen',
    datatype: 'int'
  c.inPorts.add 'close',
    datatype: 'int'
  c.outPorts.add 'request',
    datatype: 'object'
  c.outPorts.add 'server',
    datatype: 'object'
  c.outPorts.add 'listening',
    datatype: 'int'
  c.outPorts.add 'error',
    datatype: 'object'
  c.servers = {}
  closeServer = (port, callback) ->
    c.servers[port].server.close (err) ->
      return callback err if err
      unless c.servers[port]?.ctx
        # The server close listener already cleaned up
        do callback
        return
      c.servers[port].ctx.deactivate()
      delete c.servers[port]
      do callback
  c.tearDown = (callback) ->
    ports = Object.keys c.servers
    unless ports.length
      # No active servers
      do callback
      return
    # Close first server
    closeServer ports[0], (err) ->
      return callback err if err
      c.tearDown callback
      return
    return
  c.process (input, output, context) ->
    if input.hasData 'close'
      port = input.getData 'close'
      closeServer port, (err) ->
        if err
          output.done err
          return
        context.deactivate()
      return
    return unless input.hasData 'listen'
    port = input.getData 'listen'
    server = new http.Server
    server.listen port, (err) ->
      if err
        output.done err
        return
      # Register the server to the component instance
      c.servers[port] =
        ctx: context
        server: server
      # Pass the server forward and tell we're listening
      output.send
        server: server
        listening: port
      # Handle new requests, send them out with a unique scope
      server.on 'request', (req, res) ->
        output.send
          request: new noflo.IP 'data',
            req: req
            res: res
            port: port
          ,
            scope: uuid.v4()

      # Handle server being closed
      server.on 'close', ->
        delete c.servers[port]
        context.deactivate()
    return
