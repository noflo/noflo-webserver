readenv = require "../components/WriteResponse"
socket = require('noflo').internalSocket
mocks = require 'mocks'

setupComponent = ->
  c = readenv.getComponent()
  ins = socket.createSocket()
  string = socket.createSocket()
  out = socket.createSocket()
  c.inPorts.in.attach ins
  c.inPorts.string.attach string
  c.outPorts.out.attach out
  [c, ins, string, out]

exports['test writing string to a HTTP response'] = (test) ->
  test.expect 3
  [c, ins, string, out] = setupComponent()

  response = new mocks.http.ServerResponse
  response.write = (data) ->
    test.equal data, 'Hello, World!'
    response.string = data

  out.once 'data', (data) ->
    test.equal data.res instanceof mocks.http.ServerResponse, true
    test.equal data.res.string, 'Hello, World!'
    test.done()

  string.send 'Hello, World!'
  do string.disconnect
  ins.send
    res: response
  do ins.disconnect
