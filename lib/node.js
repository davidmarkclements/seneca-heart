var entity;
var _ = require('underscore');

module.exports = function (seneca, state, options, ping) {

  entity = entity || seneca.make$('farm/node');
  ping = ping();

  var name = 'heart'
  var clients = state.clients;
  var actives = state.actives;
  var nodes = state.nodes;
  var pings = state.pings;

  // define farm/node entity
  seneca.add({init:name}, function(args, done){
    seneca.act('role:util, cmd:define_sys_entity', {
      list: [entity.canon$()]
    })

    if (options.monitor) {

      entity.list$(function(err,list){
        if(err) return done(err);

        _.each( list, function(node){
          nodes.push(node.id)
          if( n.active ) {
            actives.push(n.id)
          }
        })
      })

      done();
      ping.next();
      return;
    }

    done();
  })

  function add(args, done) {
    entity
      .make$({
        id$:args.id,
        port:parseInt(args.port),
        host:args.host,
        path:args.path,
        active:false,
        errcount:0
      })
      .save$(function(err, node){
        if (err) { return done(err); }

        nodes.push(node.id)
        nodes = _.uniq(nodes)
        ping.exec(node.id)

        return done(null, {ok: true, node: node})
      })
  }


  function remove(args, done) {
    entity.remove$(args.id, function(err, node) {
      if (err) { return done(err); }

      delete clients[args.id]
      nodes   = _.without( nodes, args.id )
      actives = _.without( actives, args.id )

      return done(null,{ok:true,id:args.id})
    })
  }


  function select(args, done) {
    var nodeid = actives[actives.length * Math.random()]
    entity.load$(nodeid, done)
  }

  function bad(node) {
    seneca.log.debug('ping',false,node.id,node)

    if(node.active) {
      node.since = new Date().toISOString()
    }
    node.errcount++
    if(options.maxerr < node.errcount) {
      node.active = false
      actives = _.without(actives,node.id)
    }

    if(!node.active && options.culltime < new Date() - new Date(node.since)) {
      seneca.act({role:name,cmd:'remove-node',id:node.id})
      return;
    }

    node.save$(function(err,node){
      if(err) {
        pings[nodeid] = false
        return;
      }
      
      setTimeout(function(){ 
        ping.exec(node.id) 
      }, options.minwait + (options.maxwait * Math.random()))

    })
    
  }


  return {
    add: add,
    remove: remove,
    select: select,
    bad: bad,
    entity: entity
  }

}