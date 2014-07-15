var seneca = require('seneca')()
seneca.use('../index', {
	id: 'monitor',
	monitor: true,
	on: {
	  lost: function (node) {
	  	console.log('OH NO WE LOST ONE!', node);
	  },
	  found: function (node) {
	  	console.log('YAY RETURN OF THE PRODIGAL!', node);
	  },
	  added: function (node) {
	  	console.log('FRESH NODE', node);
	  }
	} 
})


seneca.client();