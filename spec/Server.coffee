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
    it 'should not be active', ->
      chai.expect(c.load).to.equal 0

  describe 'listening to a port', ->
    it 'should report that it is listening', (done) ->
      listening.once 'data', (listenedPort) ->
        chai.expect(listenedPort).to.equal port
        done()
      listen.send port
    it 'should contain a server', ->
      chai.expect(c.servers[port]).to.be.an 'object'
    it 'should be active', ->
      chai.expect(c.load).to.equal 1
    describe 'when receiving a request', ->
      scope = null
      req = null
      clientReq = null
      it 'should be sent to the request port', (done) ->
        @timeout 5000
        request.once 'ip', (ip) ->
          chai.expect(ip.type).to.equal 'data'
          req = ip.data
          scope = ip.scope
          done()
        clientReq = http.get "http://localhost:#{port}/foo", ->
      it 'should have an unique scope', ->
        chai.expect(scope).to.be.a 'string'
      it 'should contain req, res, and port parts', ->
        chai.expect(req.req).to.be.an 'object'
        chai.expect(req.res).to.be.an 'object'
        chai.expect(req.port).to.be.a 'number'
      it 'should be possible to respond to', (done) ->
        clientReq.on 'response', (message) ->
          chai.expect(message.statusCode).to.equal 200
          done()
        req.res.end()
    describe 'when closed', ->
      it 'should report that it has closed', (done) ->
        @timeout 5000
        c.on 'deactivate', (load) ->
          return if load
          done()
        close.send port
      it 'should not longer be in the servers list', ->
        chai.expect(c.servers).to.be.empty
