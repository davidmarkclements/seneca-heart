
seneca = require('seneca')();
seneca.use('../index', {id:'node2'});
seneca.client();

process.stdin.resume();