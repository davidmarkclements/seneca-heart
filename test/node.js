
seneca = require('seneca')();
seneca.use('../index', {id:'node'});



seneca.listen();



process.stdin.resume();