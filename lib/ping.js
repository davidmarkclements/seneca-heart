var _ = require('underscore');

function interval(n, fn) {
  var tid = setTimeout(t, n);
  var done;

  function t() {
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


  function all() {
    state.entity.list$(function(err, list) {
      if (err) return done(err);
      list.forEach(function (n) {
        
        pings[n.id] = interval(options.monitor.interval, function() {

          var pattern = {role: name, cmd: 'ping', id: n.id};

          if (seneca.findact(pattern)) { 
            return node.unreachable(n, {err: 'No pattern', id: n.id}); 
          }

          seneca.act(pattern, function (err, pong) {
            if (err) { return node.unreachable(n, err); }
            node.reachable(n);
          })

        });
        
      });
    });
  }
  

  return {
    all: all,
    s: pings
  }
 
}