noflo = require "noflo"
connect = require "connect"
_ = require "underscore"

class BodyParser extends noflo.Component

  description: "This applies connect.bodyParser middleware"

  constructor: ->
    @forward = _.bind(@forward, this)

    @inPorts =
      in: new noflo.Port()
    @outPorts =
      out: new noflo.Port()

    @inPorts.in.on "data", (request) =>
      @request = request

    @inPorts.in.on "disconnect", =>
      { req, res } = @request

      connect.bodyParser(req, res, @forward) @request.req, @request.res, @forward

  forward: ->
    @outPorts.out.send(@request)
    @outPorts.out.disconnect()
    @request = null

exports.getComponent = -> new BodyParser
