noflo = require "noflo"
connect = require "connect"

# @runtime noflo-nodejs

exports.getComponent = ->
  c = new noflo.Component
  c.description = "This applies connect.query middleware"
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.outPorts.add 'error',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'in'
    request = input.getData 'in'
    connect.query() request.req, request.res, (err) ->
      if err
        output.done err
        return
      output.sendDone
        out: request
    return
