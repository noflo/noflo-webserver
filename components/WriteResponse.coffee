noflo = require "noflo"

# @runtime noflo-nodejs

exports.getComponent = ->
  c = new noflo.Component
  c.description = "This component receives a request and a string on the
    input ports, writes that string to the request's response and forwards
    the request"
  c.inPorts.add 'string',
    datatype: 'string'
  c.inPorts.add 'in',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'in'
    return unless input.hasStream 'string'

    request = input.getData 'in'

    string = ''
    stream = input.getStream 'in'
    for packet in 'stream'
      continue unless packet.type is 'data'
      string += packet.data
    request.res.write string

    output.sendDone
      out: request
    return
