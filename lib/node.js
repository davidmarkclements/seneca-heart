// var entity;
var _ = require('underscore');

module.exports = function (seneca, state, options, ping) {

  var entity = state.entity = state.entity || seneca.make$('farm/node');
  ping = ping();

  var name = 'heart'
  var nodes = state.nodes;
  var pings = state.pings;

  // define farm/node entity
  seneca.add({init:name}, function(args, done){
    seneca.act('role:util, cmd:define_sys_entity', {
      list: [entity.canon$()]
    })

    if (options.monitor) {

      entity.list$(function(err, list){
        if(err) return done(err);

        _.each(list, function(node){
          nodes.push(node.id)

        })
      })

      done();
      // ping.next();
      return;
    }

    done();
  })

  function add(args, done) {
    entity
      .make$({
        id$: args.id,
        host: args.host,
        path: args.path,
        active: false,
        errcount: 0
      })
      .save$(function(err, node){
        if (err) { return done(err); }

        nodes.push(node.id)
        nodes = _.uniq(nodes)
        // ping.exec(node.id)

        //set up a ping act on every node, monitors
        //will use this to check for the presence of a node
        seneca.add({role: name, cmd: 'ping', id: options.id}, function (err, done) { 
          done(null, {ping: 'pong', id: options.id});
        });

        return done(null, {ok: true, node: node})
      })
  }


  function remove(args, done) {
    entity.remove$(args.id, function(err, node) {
      if (err) { return done(err); }

      nodes   = _.without(nodes, args.id)

      return done(null,{ok:true,id:args.id})
    })
  }


  function select(args, done) {
    var actives = nodes.map(function(node){return node.active});
    var nodeid = actives[actives.length * Math.random()]
    entity.load$(nodeid, done)
  }

  function cull(node) {
    console.log('cull?')

    if (node.active) {return;}

    console.log('cull')
    seneca.act({role: name, cmd:'remove-node', id: node.id})


  }

  function reachable(node) {
    node.errcount = 0;
    node.active = true;
  }

  function unreachable(node, err) {

    node.errcount += 1;

    if(node.errcount >= options.monitor.attempts) {
      node.active = false;
      pings[node.id].clear();
      delete pings[node.id];
      node.unreachableSince = (new Date).toISOString();
      setTimeout(cull.bind(null, node), options.monitor.cull);
    }

    node.save$(function(err, node){
      if(err) {
        pings[node.id].clear()
        delete pings[node.id]
        return;
      }
    })
    
  }


  return {
    add: add,
    remove: remove,
    select: select,
    unreachable: unreachable,
    reachable: reachable,
    entity: entity
  }

}