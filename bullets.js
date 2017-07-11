// Require dependencies
var io                 = require('socket.io-client');
global.XMLHttpRequest     = require("xmlhttprequest").XMLHttpRequest;

var mainGameLoop       = null;
var serverBulletList   = {};
var serverShipList     = {};

var bulletState        = false;
var shipState          = false;

var updateSpeed        = 100;
var shipCount = 0;
var issObject = {};
var weaponMesh = {};

var threeDeeObject = {}; 

var fs = require("fs");
var http = require('http');
var fabric = require("fabric");
var jsdom = require("jsdom");

function read(f) {
  return fs.readFileSync(f).toString();
}
function include(f) {
  eval.apply(global, [read(f)]);
}

Number.isInteger = Number.isInteger || function(value) {
	  return typeof value === 'number' && 
	    isFinite(value) && 
	    Math.floor(value) === value;
	};

include('three.js');
include('Math.js');
include('threeDee.js');

var textureLoader = new THREE.TextureLoader();
var objectLoader  = new THREE.ObjectLoader();

var scene = new THREE.Scene();

loadModels();

function handler(req, res) {

}

socket = io.connect('http://127.0.0.1:8000'); 

// Create a new socket connection
socket.on('connect', function() {
	token = {};
	token.name = 'Collision Checker';
	token.game = 0;
	
	socket.emit('set token', token);

	console.log("     Collision Checker Online!!!");

	socket.on('add_bullet', function (data) {
		addBulletData( data );
	});
	
	socket.on('remove_bullet', function (data) {
		removeBulletData( data );
	});
	
	socket.on('receive_ship_list', function (data) {
		updateShipData( data );
	});
});	

function loadModels() {
	threeDeeObject = new threeDee();
	threeDeeObject.initalize();
	threeDeeObject.render();
	
	var bulletMesh = {};
	var bulletMap = new THREE.MeshPhongMaterial( {
		specular: 0xFFFFFF,
		shininess: 100,
		//map: textureLoader.load( "assets/images/sun.jpg" ),
		normalScale: new THREE.Vector2( 0.85, 0.85 )
	} );
	
	var bulletMesh = new THREE.SphereGeometry( 1, 4, 4 );
	
	this.weaponMeshObject = new THREE.Mesh( bulletMesh, bulletMap );
	
	weaponMesh = new THREE.Mesh( bulletMesh, bulletMap );
	
	//console.log(weaponMesh);
	
	objectLoader.load("http://127.0.0.1:8888/fighter2/assets/models/alienFighter.json", function ( object ) {
		object.name = 'unnamed';

		object.scale.multiplyScalar( 0.3 );
		
		for (var prop in object.children[0].children) {
			var obj = object.children[0].children[prop];
			
	        // skip loop if the property is from prototype
	        if(!obj.hasOwnProperty(prop)) {
	        	obj.geometry.computeBoundingSphere();
	        }
	    }
		
		object.updateMatrixWorld( true );

		issObject = object;

		scene.add(issObject);
	});
}

function gameLoop() {
	threeDeeObject.animate();
	
	if(shipState == false) {
		socket.emit('request_ship_list');
	} else {
		if (typeof issObject.clone === 'function') {
			runCollisionDetection();
		
			shipState   = false;
		} else {
			loadModels();
		}
	}
}

function runCollisionDetection() {

	for (var key in serverBulletList) {
		var object = serverBulletList[key];
	
		object.translateZ( 0.060590000000000144 * -10128 );
		//object.updateMatrixWorld();
		
		detectCollision( object );

	}
}


function detectCollision( object ) {
	originPoint = object.position.clone();
	//console.log(originPoint);
	//object.updateMatrixWorld()

	for (var vertexIndex = 0; vertexIndex < object.geometry.vertices.length; vertexIndex++)
	{		
		var localVertex = object.geometry.vertices[vertexIndex].clone();
		var globalVertex = localVertex.applyMatrix4( object.matrix );
		var directionVector = globalVertex.sub( object.position );
		
		var ray = new THREE.Raycaster( originPoint, directionVector.clone().normalize() );
		
		var array = [];
		
		for(key2 in serverShipList) {
			if(key2 != object.origin) {
				array.push(serverShipList[key2].object);
			}
		}
		
		/*
		for(key2 in serverShipList) {
			var object2 = serverShipList[key2];
		
			//object2.object.updateMatrixWorld();

			//console.log(object2.object.children);
			
			if(key2 != object.origin) {		
				
				for(var childId in object2.object.children[0]) {
					var mesh = object2.object.children[0][childId];
					
					if(mesh.type != "PointLight") {
						array.push(mesh);
					}
				}
			}
		}
		*/
		
		var collisionResults = ray.intersectObjects( array, true );

		if ( collisionResults.length > 0 && collisionResults[0].distance < directionVector.length() ) {
			console.log('HIT!');
		}

	}

	object.checked = true;
}

function addBulletData( object ) {
	//console.log(object);
	var	newWeaponMesh = weaponMesh.clone();
	
	newWeaponMesh.rotation = {};
	newWeaponMesh.position = {};

	newWeaponMesh.rotation.x = object.rotation.x;
	newWeaponMesh.rotation.y = object.rotation.y;
	newWeaponMesh.rotation.z = object.rotation.z;
	
	newWeaponMesh.position.x = object.position.x + 5;
	newWeaponMesh.position.y = object.position.y + 8;
	newWeaponMesh.position.z = object.position.z;
	newWeaponMesh.lifeTime = 200;
	newWeaponMesh.bulletid = object.id;
	newWeaponMesh.origin = object.origin;
	
	serverBulletList[newWeaponMesh.bulletid] = newWeaponMesh;
	
	//console.log(newWeaponMesh);
	//process.exit();
	//console.log(serverBulletList);
	//process.exit();
	
	scene.add( newWeaponMesh );
}

function removeBulletData( data ) {
	delete serverBulletList[data];
}

function updateShipData( receivedData ) {
	var data = receivedData;

	for (var key1 in data) {

			var newShip = true;
			for (var key2 in serverShipList) {
				if(data[key1].shipid == serverShipList[key2].shipid) {
					newShip = false;
				} 
			}

			if(newShip == true) {
				if (typeof issObject.clone === 'function') {
					var  newShipId = data[key1].id;
					
					serverShipList[newShipId] = data[key1];
					
					serverShipList[newShipId].shipid = newShipId;
					
					serverShipList[newShipId].object = {};
					
					serverShipList[newShipId].object = issObject.clone();
	
					//serverShipList[newShipId] = data[key1];
									
					serverShipList[newShipId].object.position.x = parseFloat(data[key1].x);
					serverShipList[newShipId].object.position.y = parseFloat(data[key1].y);
					serverShipList[newShipId].object.position.z = parseFloat(data[key1].z);
					
					serverShipList[newShipId].object.rotation.x = parseFloat(data[key1].rotx);
					serverShipList[newShipId].object.rotation.y = parseFloat(data[key1].roty);
					serverShipList[newShipId].object.rotation.z = parseFloat(data[key1].rotz);
					
					serverShipList[newShipId].object.name = 'ship_' + key1;
	
					shipCount = shipCount + 1;
					
					scene.add( serverShipList[newShipId].object );
				} else {
					loadModels();
				}
			} else {
				serverShipList[key1].object.position.x = parseFloat(data[key1].x);
				serverShipList[key1].object.position.y = parseFloat(data[key1].y);
				serverShipList[key1].object.position.z = parseFloat(data[key1].z);
				
				serverShipList[key1].object.rotation.x = parseFloat(data[key1].rotx);
				serverShipList[key1].object.rotation.y = parseFloat(data[key1].roty);
				serverShipList[key1].object.rotation.z = parseFloat(data[key1].rotz);
				
				serverShipList[key1].hull       = parseFloat(data[key1].hull);
				serverShipList[key1].orderset   = parseFloat(data[key1].orderset);
				
				serverShipList[key1].sweep      = parseFloat(data[key1].sweep);
				serverShipList[key1].range      = parseFloat(data[key1].range);
				serverShipList[key1].mode       = parseFloat(data[key1].mode);
				serverShipList[key1].bonus      = parseFloat(data[key1].bonus);				
			}
			
	}

	shipState   = true;
}

mainGameLoop = setInterval(gameLoop,updateSpeed);

/*
function addNpc( data ) {
	var ship3 = {};
	var type = data.type;
	var game = data.game;
	
	
		ship3['id']           = newShipId;       // Ship ID
		ship3['game']         = game;              // game
		ship3['displayName']  = shipNames[type] + ' ' + newShipId;   // Ship Name
		ship3['name']         = 'enemyShip';     // Object Name
		ship3['type']         = shipTypes[type]; // Object Type
		ship3['otype']        = 'ship';		     // Object Type
		ship3['hull']         = 100;             // Ship Health (100)
		ship3['heading']      = 0;	             // Object Heading
		ship3['rawheading']   = 0;	             // Object Heading
		ship3['speed']        = 0;               // Object Speed
		ship3['x']            = 1924;	         // Object X Location
		ship3['y']            = 1744;            // Object Y Location
		ship3['origin']       = 'server';        // Object Creator
		ship3['checked']      = false;           // Object Collision Checking Flag
		ship3['height']       = 165;             // Set the Height
		ship3['width']        = 55;              // Set the Width		
		ship3['shipid']       = newShipId;       // Set the Width
		ship3['owner']		  = 'server';        // Owner Username
		ship3['fuel']		  = 10000000;        // Fuel Status
		ship3['system']		  = 1;               // Current Systems
		ship3['maxSpeed']     = 1;               // Speed Multiplier
		ship3['homeplanet']   = 0;               // Home Planet (for defense later)
		ship3['faction']      = 0;               // Ships faction
		// Radar Settings
		ship3['sweep']        = 180;             // Radar Sweep Arc
		ship3['range']        = 4;               // Radar Range
		ship3['mode']         = 1;               // Radar Mode
		ship3['bonus']        = 0;               // Radar Gear Bonus
		// Mood Settings
		ship3['alert']        = 0;               // Alert Status
		ship3['patriotism']   = 0;               // Willinginess to Obey
		ship3['boredom']      = 0;               // Willingness to Engage
		ship3['morale']       = 0;               // Willingess to Fight
		ship3['guard']        = 0;               // Willingness to Defend
 		// Order Settings
		ship3['orderset']     = 0;               // Order set (from DB)
		ship3['destinationx'] = 0;               // Current X/Y Destination
		ship3['destiantiony'] = 0;               // Current X/Y Destination
		ship3['orders']       = null;            // Current thing to do at X/Y

	if(databaseShipList[game] == undefined) {
		databaseShipList[game] = [];
	}
	
	databaseShipList[game][newShipId] = ship3;
	
	var data  = {};
	data.id   = newShipId;
	data.game = game;
	
	socket.emit('broadcast_newship', data);
}

function isEven(value) {
	return (value%2 == 0);
}

function gameLoop() {
	// Set all objects as unchecked
	resetCollisionChecking();
	
	socket.emit('set nickname', 'NPC Handler');
	socket.emit('set nickname', 'NPC Handler');
	
	fuelCounter = fuelCounter + 1;
	bulletIteration = bulletIteration + 1;
	turnCounter = turnCounter + 1;

		for (var key in serverShipList[game]) {
		   // On every object...
		   var object = databaseShipList[game][key];
		   object.game = game;
	
		   // Move it
		   moveObject(object);
		   
		   if(object.otype == 'ship') {
			   if(turnCounter > 25) {
			       checkTarget(object);
			   }
			   
			   // Fire it's weapons
			   fireGuns(object);
		   }
		   
		   if(object.otype == 'squadron') {
			   if(object.hull < 10) {
				   object.orders = 'Recall';
			   }
			   if(object.orders == 'Hunt') {			   
				   if(turnCounter > 25) {
				       checkTarget(object);
				   }
				   
				   huntShip( object );
				   
				   // Fire it's weapons
				   fireGuns(object);
			   }
			   if(object.orders == 'Guard') {
				   guardShip( object );
				   findTarget( object );
				   fireGuns(object);
			   }
			   if(object.orders == 'Patrol') {
				   patrolShip( object );
				   findTarget( object );
				   fireGuns(object);			   
			   }	
			   if(object.orders == 'Scout') {
				   scoutShip( object );
			   }			   
			   
			   if(object.orders == 'Attack') {
				   //if(turnCounter > 25) {
					   if(databaseShipList[game][object.target] != undefined) {
						   if(turnCounter > 25) {
							   lockTarget( object, databaseShipList[game][object.target] );
						   }
						   fireGuns(object);
					   } else {
							databaseShipList[game][key].link = false;
							databaseShipList[game][key].target = databaseShipList[game][key].homebase;
							databaseShipList[game][key].orders = "Guard";
							console.log(object.shipid + ' set to GUARD!');
					   }
				   //}
			   }		   
			   if(object.orders == 'Recall') {
				   checkDock( object );
			   }		  
		   }
		   
		   // If it's a ship...
		   if(object.otype == 'ship' || object.otype == 'squadron') {
			   // check it for Collisions
			   detectCollision2(object);
		   
			   if(fuelCounter > 200) {
				   if(object.speed != 0) {
					   databaseShipList[game][key].fuel = databaseShipList[game][key].fuel - 1;
				   }
			   }
			   if(object.hull < 12 && (object.homeplanet != null && object.homeplanet != '' && object.homeplanet != undefined) 
					               && (object.orderset == null || object.orderset != '' || object.orderset != undefined)) {
				   fleeToHome(object);
			   } else {
				   if(checkForOrders(object, game)) {
					   var orders = databaseShipList[game][key].orders;
		
					   var count = 0;
					   
					   for (var orderscount in orders) {
						   if(count == 0) {
							   processOrders(orders[orderscount], key, game);
							   count = count + 1;
						   }
					   }
					   
				   }
			   }
			   
		   }
	
		   objectCleanup(object);
		}
	

	if(fuelCounter > 200) {
		fuelCounter = 0;
	}
	
	if(bulletIteration > 5) {
		bulletIteration = 0;
	}
	
	if(turnCounter > 25) {
		turnCounter = 0;
	}
	
	for(var game in databaseShipList) {
		for(var shipid in databaseShipList[game]) {
			//if(databaseShipList[game][shipid].owner == 'server') {
				socket.emit( 'emit_npc_player_data', databaseShipList[game][shipid]);
			//}
		}
	}
}


function checkForHeadingToDestination( shipid, x2, y2, game ) {
	var x2       = x2;
	var y2       = y2;
	var x1       = databaseShipList[game][shipid].x;
	var y1       = databaseShipList[game][shipid].y;
	
	var newAngle = checkangle(x2,y2,x1,y1);
	
	//newAngle = newAngle + 180;

	if(newAngle > 360) {
		newAngle = newAngle - 360;
	}	

	return newAngle;
}

function checkForDistanceToObject( shipid, x2, y2, game ) {
	var x2       = x2;
	var y2       = y2;
	var x1       = databaseShipList[game][shipid].x;
	var y1       = databaseShipList[game][shipid].y;
	
	var a = Math.abs(x1) - (x2);
	var b = Math.abs(y1) - (y2);
	var c = (a * a) + (b * b);
	var d =  Math.sqrt(c);
	
	var distance = d;	
	
	return distance;
}

function createTorpedo( ship, target, game ) {
	// Create a new Bullet Object
	var bullet = {};
	
	var x1 = databaseShipList[game][target].x;
	var y1 = databaseShipList[game][target].y;	
	
	var x2 = databaseShipList[game][ship].x;
	var y2 = databaseShipList[game][ship].y;

	var testAngle3 = checkangle(x1,y1,x2,y2);
	
	bullet['name']        = 'torpedo' + bulletCount;        // Give it a unique name
	bullet['owner']       = 'server';                  	    // Give it an owner
	bullet['type']        = 'torpedo';                      // Give it a type
	bullet['hull']        = 15;                             // Bullet Health (1)
	bullet['heading']     = testAngle3;                     // Give it a heading
	bullet['speed']       = 10;                             // Give it a speed
	bullet['system']      = databaseShipList[game][ship].system;  // System for the Bullet
	bullet['x']           = databaseShipList[game][ship].x + 25;  // Center it on the origin
	bullet['y']           = databaseShipList[game][ship].y + 25;  // Center it on the origin
	bullet['origin']      = ship;                           // Set the Origin
	bullet['checked']     = false;                          // Set it's collision to unchecked
	bullet['height']      = 10;                             // Set the Height
	bullet['width']       = 4;                              // Set the Width
	bullet['updateCount'] = 0;                              // Set the Width
    bullet['faction']     = databaseShipList[game][ship].faction; 
    bullet['target']      = target;
    bullet['game']        = game;
    
	bulletCount = bulletCount + 1;
		
	socket.emit('newBullet', bullet);
}

function getRange (px,py,cx,cy) {
    xs = px - cx;
    xs = xs * xs;

    ys = py - cy;
    ys = ys * ys;

    var third = Math.sqrt( xs + ys );
    
    return third;
}

function resetCollisionChecking() {
	for (var game in databaseShipList) {
		for (var key in databaseShipList[game]) {
			var object = databaseShipList[game][key];
			object.checked = false;
		}
	}
}

*/

