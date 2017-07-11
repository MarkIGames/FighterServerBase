function threeDee() {
	
	var radius        = 6371;
	var tilt          = 0.41;
	var rotationSpeed = 0.02;
	var cloudsScale   = 1.005;
	var moonScale     = 0.23;
	var MARGIN        = 0;
	var SCREEN_HEIGHT = 1920 - MARGIN * 2;
	var SCREEN_WIDTH  = 1080;
	var camera;
	var controls;
	var scene;
	var renderer;
	var dirLight;
	var textureLoader = new THREE.TextureLoader();
	var clock         = new THREE.Clock();
	var delta;
	
	var cameraViewProjectionMatrix = new THREE.Matrix4();

	this.initalize = function() {
		camera = new THREE.PerspectiveCamera( 25, 1920 / 1080, 50, 1e7 );
		scene = new THREE.Scene();
		scene.fog = new THREE.FogExp2( 0x000000, 0.00000025 );
		//controls = new THREE.flightControls ( camera );

		dirLight = new THREE.PointLight( 0xffffff, 0.40);
		dirLight.position.set( 0, 0, -32229600 );
		scene.add( dirLight );
	
		dirLight = new THREE.PointLight( 0xffffff, 0.03);
		dirLight.position.set( 0, 0, 32229600 );
		scene.add( dirLight );
	
		dirLight = new THREE.PointLight( 0xffffff, 0.03);
		dirLight.position.set( 32229600, 0, 0 );
		scene.add( dirLight );
	
		dirLight = new THREE.PointLight( 0xffffff, 0.03);
		dirLight.position.set( -32229600, 0, 0 );
		scene.add( dirLight );
		
		/* MOVE THESE LATER */
		//buildPlanets();
		//scene.add( shipObject );
	
		var randomOffset = Math.random() * (4000 - -4000) + -4000;
		
		camera.position.z = (radius * 4) * -1;
		camera.position.x = (radius * 10) * -1;
		
		/* MOVE THESE LATER */
		//camera.lookAt( earthMesh.position );

		camera.updateMatrixWorld(); // make sure the camera matrix is updated
		camera.matrixWorldInverse.getInverse( camera.matrixWorld );
		cameraViewProjectionMatrix.multiplyMatrices( camera.projectionMatrix, camera.matrixWorldInverse );

		var i, r = radius, starsGeometry = [ new THREE.Geometry(), new THREE.Geometry() ];
		for ( i = 0; i < 250; i ++ ) {
			var vertex = new THREE.Vector3();
			vertex.x = Math.random() * 2 - 1;
			vertex.y = Math.random() * 2 - 1;
			vertex.z = Math.random() * 2 - 1;
			vertex.multiplyScalar( r );
			starsGeometry[ 0 ].vertices.push( vertex );
		}
		for ( i = 0; i < 1500; i ++ ) {
			var vertex = new THREE.Vector3();
			vertex.x = Math.random() * 2 - 1;
			vertex.y = Math.random() * 2 - 1;
			vertex.z = Math.random() * 2 - 1;
			vertex.multiplyScalar( r );
			starsGeometry[ 1 ].vertices.push( vertex );
		}
		var stars;
		var starsMaterials = [
			new THREE.PointsMaterial( { color: 0x555555, size: 2, sizeAttenuation: false } ),
			new THREE.PointsMaterial( { color: 0x555555, size: 1, sizeAttenuation: false } ),
			new THREE.PointsMaterial( { color: 0x333333, size: 2, sizeAttenuation: false } ),
			new THREE.PointsMaterial( { color: 0x3a3a3a, size: 1, sizeAttenuation: false } ),
			new THREE.PointsMaterial( { color: 0x1a1a1a, size: 2, sizeAttenuation: false } ),
			new THREE.PointsMaterial( { color: 0x1a1a1a, size: 1, sizeAttenuation: false } )
		];
		for ( i = 10; i < 30; i ++ ) {
			stars = new THREE.Points( starsGeometry[ i % 2 ], starsMaterials[ i % 6 ] );
			stars.rotation.x = Math.random() * 6;
			stars.rotation.y = Math.random() * 6;
			stars.rotation.z = Math.random() * 6;
			s = i * 10;
			stars.scale.set( s, s, s );
			stars.matrixAutoUpdate = false;
			stars.updateMatrix();
			scene.add( stars );
		}
		renderer = new THREE.WebGLRenderer();
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
		renderer.sortObjects = false;

		var renderModel = new THREE.RenderPass( scene, camera );
		var effectFilm = new THREE.FilmPass( 0, 0, 2048, false );
		effectFilm.renderToScreen = true;
		composer = new THREE.EffectComposer( renderer );
		composer.addPass( renderModel );
		composer.addPass( effectFilm );

		this.animate();
	}
		
	this.animate = function() {
		var threeDee = threeDeeObject;
		
		//animate = threeDee.animate;
		
		//requestAnimationFrame( animate );
				  
		threeDee.render();
	}
	
	this.render = function() {
		delta = clock.getDelta();

		controls.pollControls( delta );
		controls.update( delta );
		composer.render( delta );
	}
	
	this.getCamera = function() {
		return camera;
	}
	
	this.getDelta = function() {
		return delta;
	}
	
	this.getScene = function() {
		return scene;
	}
	
	this.getControls = function() {
		return controls;
	}
	
}