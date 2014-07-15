/* Copyright (c) 2013-2014 Richard Rodger & David Mark Clements, MIT License */
"use strict";

var _     = require('underscore')
var path = require('path')
var crypto = require('crypto');
var fs = require('fs');


var node = require('./lib/node');
var ping = require('./lib/ping');
var constants = require('./lib/constants');
var LOST = constants.events.LOST;
var FOUND = constants.events.FOUND;
var ADDED = constants.events.ADDED;

var state = {
  nodes: [],
  pings: {},
}

function hashFileSync(filePath, salt) {
  salt = salt || '';
  hashFileSync[filePath] = fs.readFileSync(filePath);
  return crypto.createHash('md5').update(hashFileSync[filePath], salt).digest('hex');
}


module.exports = function(options) {
  var seneca = this
  var name = 'heart'
  var mainModule = process.mainModule.filename

  options = seneca.util.deepextend({
    id: hashFileSync(mainModule),
    monitor: false,
    persist: {
      plugin: 'jsonfile-store',
      watch: 'jsonfile-store-watcher'
    }
  }, options);

  if (options.persist.plugin === 'jsonfile-store' && !options.persist.options) {
    options.persist.options = {folder: path.join(__dirname, 'store')};
  }

  if (options.monitor) {
    options.monitor = seneca.util.deepextend({
      interval: 1111,
      timeout: 2222,
      attempts: 11,
      cull: 66e4, //11 minutes
    }, _.isObject(options.monitor) ? options.monitor : {});
  }
  if (options.on && options.monitor) {
    if (options.on.lost instanceof Function) {
      seneca.on(LOST, options.on.lost);
    }
    if (options.on.found instanceof Function) {
      seneca.on(FOUND, options.on.found);
    }
    if (options.on.added instanceof Function) {
      seneca.on(ADDED, options.on.added);
    }

  }

  if (options.on) {
    if (options.on.down instanceof Function) {
      seneca.act()
    }
  }

  if (options.id in state.nodes) {
    state.nodes[options.id].cousins = state.nodes[options.id].cousins || [];
    options.id = hashFileSync(mainModule, state.nodes[options.id].cousins.length);
    state.nodes[options.id].cousins.push(options.id);
  }

  console.log(options);

  seneca.use(options.persist.plugin, options.persist.options)
  if (options.persist.watch) {
    seneca.use(options.persist.watch)  
  }
  

  ping = ping(seneca, state, options, function () {return node;});
  node = node(seneca, state, options, function () {return ping;});

  function status(args, done) {
    node.entity.list$(function(err,list){
      if (err) { return done(err) };
      done(null, {
        pingers: Object.keys(pings).length,
        nodes: nodes,
        reachable: nodes.map(function(n){return n.active;}),
        unreachable: nodes.map(function(n){return !n.active;}),
        list: list
      })
    })
  }
  
  // actions provided
  seneca.add({role:name, cmd:'add-node'}, node.add)

  seneca.add({role:name, cmd:'remove-node'}, node.remove)

  seneca.add({role:name, cmd:'select'}, node.select)

  seneca.add({role:name, cmd:'status'}, status)

  seneca.act({role:name, cmd: 'add-node', id: options.id, path: mainModule})



  if (options.monitor) {
    ping.all();
  }
  

  return {
    name: name
  }
}
