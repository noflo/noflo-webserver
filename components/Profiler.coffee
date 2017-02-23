noflo = require "noflo"
connect = require "connect"

# @runtime noflo-nodejs

class Profiler extends noflo.Component
  description: "This component receives a HTTP request (req, res)
combination on on input, and runs the connect.profiler middleware
for that"

  constructor: ->
    @request = null

    @inPorts =
      in: new noflo.Port()
    @outPorts =
      out: new noflo.Port()

    @inPorts.in.on "data", (request) =>
      @request = request
    @inPorts.in.on "disconnect", =>
      connect.profiler() @request.req, @request.res, =>
        @outPorts.out.send @request
        @request = null
        @outPorts.out.disconnect()

exports.getComponent = -> new Profiler
