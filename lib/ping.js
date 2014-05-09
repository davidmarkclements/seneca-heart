var _ = require('underscore');
module.exports = function (seneca, state, options, node) {
  setImmediate(function () {
    node = node();
  });

  var name = 'heart'
  var badnode = node.bad;
  var clients = state.clients;
  var actives = state.actives;
  var nodes = state.nodes;
  var pings = state.pings;

  function send(args, done) {
    var node = args.node;
    var client = clients[node.id]

    if (!client) {
      client = clients[node.id] = this.client(node.port, node.host, node.path)
    }

    client.act({
      role: name,
      cmd: 'answer-ping',
      remote$: true,
      from: options.id
    }, done)
  }

  function answer(args, done) {
    var out = {
      id: options.id,
      when: new Date().toISOString(),
      state:'ok'
    }
    done(null, out)
  }

  function next() {
    setTimeout(run, options.minwait + (options.maxwait * Math.random()))
  }

  function run() {
    var nodeid = nodes[Math.floor(nodes.length * Math.random())]
    console.log('runping:' + nodeid + ' ' + nodes)

    if (!nodeid) {
      return next();
    }

    if (pings[nodeid]) {
      return next();
    }
    
    exec(nodeid)
    next()
  }

  function exec(nodeid) {
    console.log('exec ping:' + nodeid)
    if (!nodeid) { return; }

    pings[nodeid] = true

    node.entity.load$(nodeid, function(err, node){
      if (err || !node) {
        pings[nodeid] = false
        return
      }

      seneca.act({
        role: name,
        cmd: 'send-ping',
        node: node.id
      }, function(pingerr, pingres) {
        if(pingerr) { return badnode(node); }

        if(!node.active) {
          node.since = new Date().toISOString()
        }
        node.active = true
        node.errcount = 0
        actives.push(node.id)
        actives = _.uniq(actives)

        seneca.log.debug('ping', true, node.id, node)

        node.save$(function(err, node){
          pings[nodeid] = false
        })

      })
    })
  }

  return {
    send: send,
    answer: answer,
    exec: exec,
    run: run,
    next: next,
    s: pings
  }
 
}