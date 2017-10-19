noflo = require "noflo"

# @runtime noflo-nodejs

exports.getComponent = ->
  c = new noflo.Component
  c.description = "This component receives a HTTP request (req, res, next)
    combination on on input, and runs res.end(), sending the response to
    the user"
  c.inPorts.add 'in',
    datatype: 'object'
  c.process (input, output) ->
    return unless input.hasData 'in'
    request = input.getData 'in'
    request.res.end()
    output.done()
