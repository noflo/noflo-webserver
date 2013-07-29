noflo = require 'noflo'
chai = require 'chai'
http = require 'http'
Server = require '../components/Server.coffee'

describe 'Server component', ->
  port = 5656
  c = null
  listen = null
  close = null
  request = null
  listening = null
  before ->
    c = Server.getComponent()
    listen = noflo.internalSocket.createSocket()
    close = noflo.internalSocket.createSocket()
    request = noflo.internalSocket.createSocket()
    listening = noflo.internalSocket.createSocket()
    c.inPorts.listen.attach listen
    c.inPorts.close.attach close
    c.outPorts.request.attach request
    c.outPorts.listening.attach listening

  describe 'when instantiated', ->
    it 'should not contain any running servers', ->
      chai.expect(c.servers).to.be.empty

  describe 'listening to a port', ->
    it 'should report that it is listening', (done) ->
      listening.once 'data', (listenedPort) ->
        chai.expect(listenedPort).to.equal port
        done()
      listen.send port
    it 'should contain a server', ->
      chai.expect(c.servers[port]).to.be.an 'object'
    describe 'when receiving a request', ->
      groups = []
      req = null
      clientReq = null
      it 'should be sent to the request port', (done) ->
        @timeout 5000
        receivedGroups = 0
        request.on 'begingroup', (group) ->
          groups.push group
          receivedGroups++
        request.once 'data', (data) ->
          req = data
        request.on 'endgroup', ->
          receivedGroups--
          done() if receivedGroups is 0
        clientReq = http.get "http://localhost:#{port}/foo", ->
      it 'should be grouped by port and UUID', ->
        chai.expect(groups.length).to.equal 2
        chai.expect(groups[0]).to.equal port
        chai.expect(groups[1]).to.be.a 'string'
      it 'should contain req and res parts', ->
        chai.expect(req.req).to.be.an 'object'
        chai.expect(req.res).to.be.an 'object'
      it 'should be possible to respond to', (done) ->
        clientReq.on 'response', (message) ->
          chai.expect(message.statusCode).to.equal 200
          done()
        req.res.end()
    describe 'when closed', ->
      it 'should report that it has closed', (done) ->
        @timeout 5000
        disconnects = 0
        request.on 'disconnect', ->
          disconnects++
        listening.on 'disconnect', ->
          disconnects++
          chai.expect(disconnects).to.equal 2
          done()
        close.send port
      it 'should not longer be in the servers list', ->
        chai.expect(c.servers).to.be.empty
