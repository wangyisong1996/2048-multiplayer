'use strict';

var http = require('http'),
	url = require('url'),
	lodash = require('lodash'),
	uuid = require('node-uuid'),
  	sockjs = require('sockjs'),
  	multiplex_server = require('websocket-multiplex');

var sockjsServer = sockjs.createServer();
var multiplexer = new multiplex_server.MultiplexServer(sockjsServer);
var GRID_SIZE = 4;
// console.log('url.parse(req.url):', qs.parse(url.parse(req.url).pathname));
// console.log('req.url:', req.url);

var createChannel = function (channelId, cb) {
	var newChannel = multiplexer.registerChannel(channelId);

	
	var startCellLocations = function (numLocations, size) {
  		function getRandomInt(min, max) {
		  return Math.floor(Math.random() * (max - min + 1)) + min;
		}
		var loc = [];
		for (var i = 0; i < numLocations; i++) {
			var obj = {x: getRandomInt(0, size - 1), y: getRandomInt(0, size - 1), value: (Math.random() < 0.9 ? 2 : 4)};
			if (!lodash.contains(loc, obj)) loc.push(obj);
			else --i;
		}
		return loc;
  	};

	var startLocations = startCellLocations (2, GRID_SIZE);
	var _counter = 0;
	newChannel.on('connection', function(io) {
	    io.write(JSON.stringify({player: 0, startCells: startLocations, size: GRID_SIZE}));

	    io.on('data', function(data) {
	        io.write(data);
	    });
	    io.on('close', function() {
	        io.write(JSON.stringify({player: 0, dead: true}));
	        // newChannel.destroy();
	    });
	});

	cb();
};

var freeChannels = [];
var server = http.createServer(function (req, res) {
	if (url.parse(req.url).pathname === '/game/new') {
		var origin = (req.headers.origin || "*");
		
		// res.writeHead();
		var headers = {};
		headers['Content-Type'] = 'text/plain';
		headers['Access-Control-Allow-Origin'] = '*';
        headers['Access-Control-Allow-Headers'] = 'X-Requested-With';
		res.writeHead(200, headers);
		if (freeChannels.length === 0) {
			var channelId = uuid.v4();
			createChannel(channelId, function (err) {
				if (err) console.log('err:', err);
				freeChannels.push(channelId);
				res.end(JSON.stringify({player: 1, channel: channelId}));
			});
		}
		else {
			res.end(JSON.stringify({player: 2, channel: freeChannels.pop()}));
		}
	}
	else {
		res.writeHead(200, {'Content-Type': 'text/html'});
		res.end('Go away!');
	}

});

sockjsServer.installHandlers(server, {prefix:'/game/sockets'});
server.listen(3000);