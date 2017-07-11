/**
 * @author James Baicoianu / http://www.baicoianu.com/
 */

function bulletManager() {

	var bulletArray = {};
	
	this.update = function() {
		var delta       = gameEngine.returnSystem( 'threejs' ).getDelta();
		var bulletArray = gameEngine.returnSystem( 'game' ).getBulletArray();
		
		$.each( bulletArray, function( key, object ) {
			object.translateZ( delta * -10128 );
			
			detectCollision( object );
		});	
	}
	
	this.removeBullet = function( id ) {
		var bulletArray = gameEngine.returnSystem( 'game' ).getBulletArray();
		
		object = bulletArray[id];
		
		scene.remove( object );
		delete bulletArray[id];
	}

}