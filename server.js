// Require dependencies

var request           = require('request');
var app               = require('http').createServer(handler);
var fs                = require('fs');
var io                = require('socket.io').listen(app);
var mainGameLoop      = null;
var game              = 0;

var serverShipList    = {};
var serverBulletList  = {};

var shipFuel          = {};
var serverPlanetList  = {};
var serverStationList = {};
var serverGamesList   = {};
var updateSpeed       = 50;
var updateRate        = 50;
var gamesRate         = 50;
var saveRate          = 600000;
var red               = '\033[31m';
var blue              = '\033[34m';
var reset             = '\033[0m';

var update            = 1;
var bulletCount       = 0;

var returnedShipData  = {};
var clientList 		  = {};
var serverList        = {};

serverGamesList[0] = {};
serverGamesList[0] .objectives = {};

io.set('log level', 1); // Turn off standard IO Debuggin calls
app.listen(8000);	    // creating the server ( localhost:8000 )

var globalsocket;



function handler(req, res) {

}

serverShipList[0] = {};

io.sockets.on('connection', function(socket) {
	var globalsocket = socket;
	
	socket.on('set token', function(token) {
		socket.set('token', token, function() {
			/*
			if(token != 'NPC Handler' && token != 'AI Handler') {

			
				request('http://127.0.0.1:7788//space/ajax.php?action=getShipGame&token=' + token, function (error, response, data) {
					if (error == null && response.statusCode == 200) {
					*/
						//returnedShipData = JSON.parse(data);

						console.log('Connected: ' + token.name + ' to Game: ' + token.game);
						var connected_msg = '<b>' + token.name + ' connected.</b>';
						io.sockets.volatile.emit('broadcast_msg', connected_msg);
						
						socket.set('game', token.game);
						socket.set('nickname', token.name);
						
						clientList[socket.id] = {};
						clientList[socket.id].game = token.game;
						clientList[socket.id].name = token.name;
						clientList[socket.id].id   = socket.id;
						if(token.ship != undefined) {
							clientList[socket.id].ship = token.ship;
						}
						clientList[socket.id].socket = socket;
						/*
					}
				});
			}
			
						
			if(token == 'NPC Handler' || token == 'AI Handler') {
				serverList[socket.id]        = {};
				serverList[socket.id].name   = token;
				serverList[socket.id].id     = socket.id;
				serverList[socket.id].socket = socket;
			}
			*/
		});
	});
 	
	socket.on('request_ship_list', function ( data ) {
		socket.emit('receive_ship_list', serverShipList[0]);
	});
	
	socket.on('emit_local_delete', function ( data ) {
		delete serverShipList[0]['' + data.shipid + ''];

		for(var key in clientList) {
			var clientObject = clientList[key];
			var clientGame   = clientObject.game;
			
			if(clientGame == data.game) {
				clientList[key].socket.emit( 'emit_wide_delete', data);
			}
		}
	});	
		
	socket.on('broadcast_newship', function (data) {
		//console.log(serverList);
		for(var key in clientList) {
			
			var clientObject = clientList[key];
			var clientGame   = 0;

			clientList[key].socket.emit('broadcast_newship', data);
		}
		
		for(var key in serverList) {
			if(serverList[key].name != 'NPC Handler') {
				//console.log(serverList[key]);
				
				serverList[key].socket.emit( 'broadcast_newship', data );
			}
		}
	});	
		
	socket.on('broadcast_objective_change', function (data) {
		var game = data.game;
		
		if(data.type == 'enemyHeadquarters') { 
			newData = 1; 
			serverGamesList[0]['objectives'][1] = 1;
		}
		if(data.type == 'enemyShipyard') {		
			newData = 3; 
			serverGamesList[0]['objectives'][3] = 1;
		}	
		if(data.type == 'battlecruiserb') {	
			newData = 2; 
			serverGamesList[0]['objectives'][2] = 1;
		}

		for(var key in clientList) {
			
			var clientObject = clientList[key];

			clientObject.socket.emit('broadcast_objective_change', newData);
		}
	});	
	
	socket.on('transfer_fuel', function (data) {
		if(data.amount > 0 && data.target != undefined && data.target != null) {
			
			for(var key in clientList) {
				var game         = clientList[key].game;

				if(clientList[socket.id].game == game) {
					clientList[socket.id].socket.emit('transfer_fuel', data);
				}
			}
		}
	});		
	
	socket.on('transfer_station_fuel', function (data) {
		var game = clientList[socket.id].game;
		
		if(data.amount > 0) {
			var object = serverShipList[0][data.target];
	
			for(var key in serverStationList) {
				
				var otherObject = serverPlanetList[0][serverStationList[key].planet];

				if(object.system == otherObject.system ) {

					var allegience  = otherObject.allegience;
					var range  = getRange(object.x,object.y,otherObject.x,otherObject.y);
					
					if(range < 400 && allegience > 50) {
						data.amount = parseInt(object.fuel) + parseInt(data.amount);
						
						serverShipList[0][data.target].fuel = data.amount;
						
						var checkedFuel = checkMaxFuel(serverShipList[0][data.target]);
						
						data.amount = checkedFuel;
						serverShipList[0][data.target].fuel = checkedFuel;
						
						for(var key in clientList) {
							if(clientList[socket.id].game == game) {
								clientList[socket.id].socket.emit('transfer_fuel', data);
							}
						}
						
						return false;
					}
				}
			}
		}
	});	
	
	socket.on('update_fuel', function (data) {
		var game = clientList[socket.id].game;
		
		var object = serverShipList[0][data.target];

		if(object != undefined) {
			if(object.system != 1) {
				var fuelModified = -1;
				
				if(object.specials != undefined) {
					if(object.specials[9] != undefined && object.specials[9] != 0) {
						var fuelModified = 4;
					}
				}
			} else {
				var fuelModified = 500;
			}
			
			fuel = object.fuel + fuelModified;
			
			serverShipList[0][data.target].fuel = fuel;
			
			var checkedFuel = checkMaxFuel(serverShipList[0][data.target]);
			
			data.amount = checkedFuel;
			serverShipList[0][data.target].fuel = checkedFuel;
			
			for(var key in clientList) {
				if(clientList[socket.id].game == game) {
					clientList[socket.id].socket.emit('transfer_fuel', data);
				}
			}
		}
	});	
	
	socket.on('emit_player_data', function (data) {
		processPlayerData( data, socket.id );
	});	
	
	socket.on('request_objectives', function () { 
		if(clientList[socket.id] != undefined) {
			var game = clientList[socket.id].game;
	
			var objectives = serverGamesList[0].objectives;

			clientList[socket.id].socket.emit( 'game_objectives', objectives);
		}
	});	
		
  	socket.on('disconnect', function () {
		socket.get('nickname', function (err, nickname) {
			if(serverList[socket.id] == undefined) {
				console.log('Disconnect', nickname);
				var disconnected_msg = '<b>' + nickname + ' disconnected.</b>';
				if(clientList[socket.id] != undefined) {
					removeThisId = clientList[socket.id].shipid;
				}
			}

			for(var clientKey in clientList) {
				if(clientList[clientKey].name == nickname) {
					removeThisId = clientList[clientKey].ship;
				}
			}
			
			io.sockets.emit( 'broadcast_msg' , disconnected_msg);
			
			if(!(typeof removeThisId === 'undefined')) {
				io.sockets.emit( 'disconnect_action' , removeThisId);
				
				delete serverShipList[0][removeThisId];
				delete clientList[socket.id];
			}
		});
	});

	socket.on('create_bullet', function (data) {
		var xOffset = 5;
		var zOffset = -2;
		createWeapon(socket, data, xOffset, 0);
		xOffset = -5;
		createWeapon(socket, data, xOffset, 0);
		xOffset = 10;
		createWeapon(socket, data, xOffset, zOffset);
		xOffset = -10;
		createWeapon(socket, data, xOffset, zOffset);
	});	
});

function createWeapon( socket, object, xOffset, zOffset ) {
	var newWeaponMesh = {};
	
	newWeaponMesh.rotation = {};
	
	newWeaponMesh.rotation.x = object.rotx;
	newWeaponMesh.rotation.y = object.roty;
	newWeaponMesh.rotation.z = object.rotz;
	
	newWeaponMesh.position = {};
	
	newWeaponMesh.position.x = object.x + xOffset;
	newWeaponMesh.position.y = object.y + 2 + zOffset;
	newWeaponMesh.position.z = object.z;
	newWeaponMesh.lifeTime = 200;
	newWeaponMesh.origin   = object.shipid;
	
	bulletCount = bulletCount + 1;
	
	newWeaponMesh.id = bulletCount;
	
	for(var key in clientList) {
		clientList[key].socket.emit( 'add_bullet' , newWeaponMesh);
	}
	
	serverBulletList[bulletCount] = newWeaponMesh;
}

function checkMaxFuel( object ) {
	var type = object.type;

	if(object.fuel < 1) {
		object.fuel = 0;
	}
	
	if(object.fuel > shipFuel[object.type]) {
		return shipFuel[object.type];
	} else {
		return object.fuel;
	} 
}

function getRange (px,py,cx,cy) {
    xs = px - cx;
    xs = xs * xs;

    ys = py - cy;
    ys = ys * ys;

    var third = Math.sqrt( xs + ys );
    
    return third;
}


function isEven(value) {
	return (value%2 == 0);
}

function gameLoop() {
	for(var key in clientList) {
	
		var clientObject = clientList[key];
		var clientGame   = clientObject.game;
		
		broadcastShipData(  clientObject.socket, clientGame );
	}
	
	for(var key in serverList) {
		var game   = null;
		
		broadcastShipData(  serverList[key].socket, game );
	}
	
	for(var key in serverBulletList) {
		serverBulletList[key].lifeTime = serverBulletList[key].lifeTime - 1;
		
		if(serverBulletList[key].lifeTime < 1) {
			delete serverBulletList[key];
			for(var clientid in clientList) {
				clientList[clientid].socket.emit( 'remove_bullet' , key);
			}
		}
	}
}

function broadcastShipData( socket, game ) {
	data = serverShipList[0];

	socket.emit( 'broadcast_data' , data);
	
	//console.log(data);
}
	
function gamesSave() {		
	for(var game in serverShipList) {
		for(var shipId in serverShipList[0]) {
			var shipObject = {};
	
			shipObject[1] = serverShipList[0][shipId];

			var testString = JSON.stringify(shipObject);
		
			var newURI     = "http://127.0.0.1:7788//space/ajax.php?action=saveShips&data=" + testString;
		
			request(newURI, function (error, response, data) {});	
		}
	}
}

function processPlayerData( data, id ) {
	var newShip    = true;
	var playerData = clientList[id];
	var newShipId = data.shipid;

	if(playerData == undefined) {
		newShip = false;
	} else {
		for (var ship in serverShipList[0]) {
			if(data.shipid == serverShipList[0][ship].shipid) {
				newShip = false;
			} 
		}
	}

	if(newShip == true) {
		if(playerData != undefined) {
			serverShipList[0]['' + newShipId + '']  = {};
			
			//console.log(data);
			
			serverShipList[0]['' + newShipId + ''].type           = data.type;
			serverShipList[0]['' + newShipId + ''].shipid         = newShipId;
			serverShipList[0]['' + newShipId + ''].heading        = parseFloat(data.heading);
			serverShipList[0]['' + newShipId + ''].rawheading     = parseFloat(data.rawheading);
			serverShipList[0]['' + newShipId + ''].speed          = parseFloat(data.speed);

			serverShipList[0][newShipId].x              = parseFloat(data.x);
			serverShipList[0][newShipId].y              = parseFloat(data.y);
			serverShipList[0][newShipId].z              = parseFloat(data.z);
			
			serverShipList[0][newShipId].rotx           = parseFloat(data.rotx);
			serverShipList[0][newShipId].roty           = parseFloat(data.roty);
			serverShipList[0][newShipId].rotz           = parseFloat(data.rotz);
			
			serverShipList[0]['' + newShipId + ''].sweep          = parseFloat(data.sweep);
			serverShipList[0]['' + newShipId + ''].range          = parseFloat(data.range);
			serverShipList[0]['' + newShipId + ''].mode           = parseFloat(data.mode);
			serverShipList[0]['' + newShipId + ''].bonus          = parseFloat(data.bonus);
			
			//serverShipList[0]['' + newShipId + ''].system         = data.system;
			serverShipList[0]['' + newShipId + ''].speed          = parseFloat(data.speed);
		}
	} else {
		if(playerData != undefined) {
			serverShipList[0]['' + newShipId + ''].heading        = parseFloat(data.heading);
			serverShipList[0]['' + newShipId + ''].rawheading     = parseFloat(data.rawheading);
			serverShipList[0]['' + newShipId + ''].speed          = parseFloat(data.speed);

			serverShipList[0][newShipId].x              = parseFloat(data.x);
			serverShipList[0][newShipId].y              = parseFloat(data.y);
			serverShipList[0][newShipId].z              = parseFloat(data.z);
			
			serverShipList[0][newShipId].rotx           = parseFloat(data.rotx);
			serverShipList[0][newShipId].roty           = parseFloat(data.roty);
			serverShipList[0][newShipId].rotz           = parseFloat(data.rotz);
			
			serverShipList[0]['' + newShipId + ''].sweep          = parseFloat(data.sweep);
			serverShipList[0]['' + newShipId + ''].range          = parseFloat(data.range);
			serverShipList[0]['' + newShipId + ''].mode           = parseFloat(data.mode);
			serverShipList[0]['' + newShipId + ''].bonus          = parseFloat(data.bonus);
		}
	}
}

function addNpcForTesting() {
	console.log('adding ship...');
	serverShipList[0][1000] = {};
	
	serverShipList[0][1000].x      = parseFloat(-63910);
	serverShipList[0][1000].y      = parseFloat(0);
	serverShipList[0][1000].z      = parseFloat(-25484);
	serverShipList[0][1000].otype  = 'ship';
	serverShipList[0][1000].hull   = 100;
	serverShipList[0][1000].shipid = 1000;
	serverShipList[0][1000].id     = 1000;
	serverShipList[0][1000].rotx   = parseFloat(0);
	serverShipList[0][1000].roty   = parseFloat(0);
	serverShipList[0][1000].rotz   = parseFloat(0);
	serverShipList[0][1000].type   = 'alienFighter';
	console.log(serverShipList);
}

function checkObject( object, frustum, name ) {
	if(frustum.intersectsObject( object )) {
		var distance = distanceVector( camera.position, object.position );
		addRadar( name, distance, object );
	}
}

function distanceVector( v1, v2 )
{
    var dx = v1.x - v2.x;
    var dy = v1.y - v2.y;
    var dz = v1.z - v2.z;

    return Math.sqrt( dx * dx + dy * dy + dz * dz );
}

mainGameLoop   = setInterval(gameLoop, updateSpeed);

addNpcForTesting();