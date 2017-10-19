noflo = require 'noflo'

# @runtime noflo-nodejs

exports.getComponent = ->
  c = new noflo.Component
  c.description = 'Given a status code and an object containing return headers,
    call `writeHead` on incoming `res`'
  c.inPorts.add 'in',
    datatype: 'object'
  c.inPorts.add 'status',
    datatype: 'int'
  c.inPorts.add 'headers',
    datatype: 'object'
  c.outPorts.add 'out',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'in', 'status'
    return if input.attached('headers').length and not input.hasData 'headers'
    headers = {}
    if input.hasData 'headers'
      headers = inpu.getData 'headers'
    status = input.getData 'status'
    request = input.getData 'in'

    request.res.writeHead status, headers
    output.sendDone
      out: request
