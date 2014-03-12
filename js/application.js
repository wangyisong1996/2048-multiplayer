document.addEventListener("DOMContentLoaded", function () {
  	var waitingInterval;
  	var sockjs_url = 'http://2048.stolarsky.com:3000/game/sockets';
	var sockjs = new SockJS(sockjs_url);
	var multiplexer = new WebSocketMultiplex(sockjs);
  	
  	// Wait till the browser is ready to render the game (avoids glitches)
 	window.requestAnimationFrame(function () {
	 	var startNewGame = function () {
	 			$('#game-start-btn').on('click', function () {
					$('#player-msg').html('<span style="float:left">Searching for competitor </span>\n<span class="ellipsis">.</span>\n<span class="ellipsis">.</span>\n<span class="ellipsis">.</span>');
					var fadedOut = false;
					waitingInterval = setInterval(function () {
					  if (fadedOut) {
					    $('.ellipsis:eq(0)').fadeIn(500);
					    setTimeout(function() {
					      $('.ellipsis:eq(1)').fadeIn(500);
					      setTimeout(function() {
					        $('.ellipsis:eq(2)').fadeIn(500);
					      }, 250);
					    }, 250);
					    fadedOut = false;
					  } 
					  else {
					    $('.ellipsis:eq(2)').fadeOut(500);
					    setTimeout(function() {
					      $('.ellipsis:eq(1)').fadeOut(500);
					      setTimeout(function() {
					        $('.ellipsis:eq(0)').fadeOut(500);
					      }, 250);
					    }, 250);
					    fadedOut = true;
					  }
					}, 1500);
					$.get('http://2048.stolarsky.com:3000/game/new', startGame);
			  	});
	 	};

		var startGame = function (data) {
		  	data = JSON.parse(data);
		  	var player = data.player;
		  	var io = multiplexer.channel(data.channel);
			// console.log('io:', io);
			
			window._io = {
				listeners: [],
				oneTimeListeners: [],
				addListener: function (cb) {
					window._io.listeners.push(cb);
				},
				addOneTimeListener: function (callback, onlyWhen) {
					window._io.oneTimeListeners.push({
						cb: callback,
						condition: onlyWhen
					});
				}
			}

			io.onopen = function() {
				// console.log('sockjs: open');
				if (data.player === 2)
					io.send(JSON.stringify({player: data.player, start: Date.now() + 5500}));
			};

			io.onmessage = function(event) {
			    var msg = JSON.parse(event.data);
			    // console.log('message:', msg);
			    for (var i = 0, len = window._io.listeners.length; i < len; i++) {
			    	window._io.listeners[i](msg);
			    }
			    for (var i = window._io.oneTimeListeners.length - 1; i >= 0; i--) {
			    	var tempObj = window._io.oneTimeListeners[i];
			    	if (!!tempObj.condition(msg)) {
			    		tempObj.cb(msg);
			    		window._io.oneTimeListeners.splice(i, 1);
			    	}
			    }
			};

			/* Socket Listeners! */
			window._io.addListener(function (msg) {
			    if (msg.player === 0 && msg.size && msg.startCells) {
			    	window._gameBoard = {};
			    	window._gameBoard.size = msg.size;
			    	window._gameBoard.startTiles = msg.startCells;
			    	
			    }
			});

			window._io.addListener(function (msg) {
			    if (msg.start) {
			    	clearInterval(waitingInterval);
			    	$('#player-msg').html('Opponent Found!');
			    	setTimeout(function () {
			    		var countdown = setInterval(function() {
			    			window._io.player = {};
			    			window._io.player['1'] = 0;
			    			window._io.player['2'] = 0;
			    			window._io.gameOver = false;
				    		var otherPlayer = data.player === 1 ? 2 : 1;
							//console.log('===I am player ' + data.player + '===');
					    	
							// Countdown messages
					    	var timeLeft = msg.start - Date.now();
					    	var times = Math.floor(timeLeft / 1000);
				    		$('#player-msg').html('<div style="text-align: center">Game Will start in <strong>' + times + '</strong></div>');
				    		times--;
				    		if (times === -1) {
				    			clearInterval(countdown);
				    			$('#player-msg').html('<div style="text-align: center"><strong> BEGIN!</strong></div>');
				    			var localManager = new GameManager({size: window._gameBoard.size, startTiles: window._gameBoard.startTiles, player: data.player, online: false}, KeyboardInputManager, HTMLActuator, io),
					    			onlineManager = new GameManager({size: window._gameBoard.size, startTiles: window._gameBoard.startTiles, player: otherPlayer, online: true}, OnlineInputManager, HTMLActuator, io);
					    		
				    			var gameTimeLeft = 120;
				    			var timer = setInterval(function () {
									var sec; 
	    							if (gameTimeLeft % 60 === 0)
	    								sec = '00';
	    							else if (('' + gameTimeLeft % 60).length === 1)
	    								sec = '0' + gameTimeLeft % 60;
	    							else
	    							 	sec = gameTimeLeft % 60;
	      							var min = Math.floor(gameTimeLeft/60);
				    				$('#player-msg').html('<div id="timer"><strong>' + min + ':' + sec + '</strong></div>');
				    				gameTimeLeft--;
				    				// console.log('gameTimeLeft:', gameTimeLeft);
				    				if (gameTimeLeft === -1) {
				    					clearInterval(timer);
				    					$('#player-msg').html('<div id="timer"><strong>Game over!</strong></div>');
				    					window._io.gameOver = true;
				    					localManager.actuate();
										onlineManager.actuate();
										setTimeout(function () {
											$('#player-msg').fadeOut();
										}, 1000);
										setTimeout(function () {
											$('#player-msg').html('');
											$('#player-msg').fadeIn();
										}, 1000);
										setTimeout(function () {
											$('#player-msg').html('<a id="game-start-btn" class="btn">Play Again!</a>');
											startNewGame();
											$('#game-start-btn').on('click', function () {
												localManager.restart();
												onlineManager.restart();
											});
											//location.reload();
										}, 3000);
				    				}
				    			}, 750);
				    		}
				    	}, 1000);
			    	}, 1000);
			    }
			});
			
			io.onclose = function() {
			    console.log('sockjs: close');
			};
		};

		startNewGame();
  });
});
