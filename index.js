/* Copyright (c) 2013-2014 Richard Rodger & David Mark Clements, MIT License */
"use strict";

var _     = require('underscore')
var nid   = require('nid')

var node = require('./lib/node')
var ping = require('./lib/ping')

module.exports = function(options) {
  var seneca = this
  var name = 'heart'

  options = seneca.util.deepextend({
    id: nid(),
    monitor: false,
    minwait: 1111,
    maxwait: 2222,
    maxerr: 11,
    culltime: (11 * 60 * 1000)
  }, options)


  var state = {
    clients: {},
    actives: [],
    nodes: [],
    pings: {}
  }

  ping = ping(seneca, state, options, function () {return node;});
  node = node(seneca, state, options, function () {return ping;});

  function status(args, done) {
    node.entity.list$(function(err,list){
      if (err) { return done(err) };

      done(null, {
        actives: _.clone(actives),
        pings: _.clone(pings),
        nodes: nodes,
        list: list
      })

    })

  }
  
  // actions provided
  seneca.add({role:name, cmd:'send-ping'}, ping.send)

  seneca.add({role:name, cmd:'answer-ping'}, ping.answer)

  seneca.add({role:name, cmd:'add-node'}, node.add)

  seneca.add({role:name, cmd:'remove-node'}, node.remove)

  seneca.add({role:name, cmd:'select'}, node.select)

  seneca.add({role:name, cmd:'status'}, status)

  // resolve entity args by id
  seneca.act({
    role:   'util',
    cmd:    'ensure_entity',
    pin:    { role:name, cmd:'send-ping' },
    entmap: { node: node.entity }
  });


  return {
    name: name
  }
}
