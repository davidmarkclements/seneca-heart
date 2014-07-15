var _ = require('underscore');
var constants = require('./constants');
var FOUND = constants.events.FOUND;
var ADDED = constants.events.ADDED;
var LOST = constants.events.LOST;

function interval(n, fn) {
  var tid = setTimeout(t, n);
  var done = false;

  function t() {
    console.log('checking', n)
    if (done) {return;}
    fn();
    tid = setTimeout(t, n);
  }

  return {
    clear: function () {
      done = true;
      clearTimeout(tid);
    }
  };
}

module.exports = function (seneca, state, options, _node) {
  //TODO: polluting the global scope is bad mkay
  Object.defineProperty(global, 'node', {get: _node});

  var name = 'heart'
  var badnode = node.bad;
  var nodes = state.nodes;
  var pings = state.pings;

  function initPing(n) {
    if (pings[n.id]) {pings[n.id].clear();}

    pings[n.id] = interval(options.monitor.interval, function() {

      var pattern = {role: name, cmd: 'ping', id: n.id};

      // if (seneca.findact(pattern)) { 
      //   return node.unreachable(n, {err: 'No pattern', id: n.id}); 
      // }

      seneca.act(pattern, function (err, pong) {
        if (err) { return node.unreachable(n, err); }
        node.reachable(n);
      })

    }); 
    
  }

  function all() {
    state.entity.list$(function(err, list) {
      if (err) return done(err);
      list.forEach(initPing);
    });

    state.entity.on('insert', function (meta) {
      state.entity.list$({id: meta.id}, function(err, node) {
        node = node[0];
        if (!node || node.id === options.id) {return;}
        seneca.emit(ADDED, node);
        initPing(node);
      });
    });

    state.entity.on('update', function (meta) {
      state.entity.list$({id: meta.id}, function(err, node) {
        if (err) { return done(err); }
        node = node[0];
        if (!node) {return;}
        if (node.active && node.errcount === 0) {
          seneca.emit(FOUND, node);  
        }
        if (!node.active) {
          seneca.emit(LOST, node);   
        }
        
      });

    });
  }
  

  return {
    all: all,
    s: pings
  }
 
}