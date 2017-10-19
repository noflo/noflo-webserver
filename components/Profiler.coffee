noflo = require "noflo"
connect = require "connect"

# @runtime noflo-nodejs

exports.getComponent = ->
  c = new noflo.Component
  c.description = "This component receives a HTTP request (req, res)
    combination on on input, and runs the connect.profiler middleware
    for that"
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'in'
    request = input.getData 'in'
    connect.profiler() request.req, request.res, ->
      output.sendDone
        out: request
    return
