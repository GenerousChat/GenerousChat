

import logger from "../../utils/logger.js";
import supabaseService, { Message } from "../supabase.js";
import pusherService from "../pusher.js";
import analyzeMessageForVisualizationIntent from "../ai/analyzeMessageForVisualizationIntent";
import generateAITextResponse from "../ai/generateAITextResponse";
// import generateHTMLContent from "../ai/generateHTMLContent.js";
import { generateText } from 'ai';
import { openai } from '@ai-sdk/openai';
import { createXai } from "@ai-sdk/xai";
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

interface Agent {
  id: string;
  name: string;
  description?: string;
  personality_prompt?: string;
  avatar_url?: string;
}

const xai = createXai({
	apiKey: process.env.XAI_API_KEY,
});

async function generateResponseWithAgent(
  roomId: string,
  agent: Agent,
  lastUserMessage: Message,
  messageHistory: string,
  lastGenerationHtml: string
): Promise<boolean> {
  try {


    /*
    messageHistory (10-30)
    lastGenerationHtml 
    lastUserMessage
    agentCasualMessage (100-200 chars)
    agentExpertMessage (1000 chars) 

    visualizationConfidencePrompt (sent to client be rendered in chat)
    agentCasualPrompt (sent to client be rendered in chat)
    agentExpertPrompt (sent to the htmlGenerationPrompt)
    htmlGenerationPrompt (stored in database)
    
    */

    logger.info(`Generating response with agent: ${agent.name}`);

    // Check if the message is asking for a visualization
    const visualizationConfidence = await analyzeMessageForVisualizationIntent(
      lastUserMessage,
      lastGenerationHtml,
      messageHistory
    );

    const shouldGenerateHtml = visualizationConfidence > 0.5;
    logger.info(
      `Visualization confidence: ${visualizationConfidence}. Will ${
        shouldGenerateHtml ? "" : "not "
      }generate HTML`
    );

    //// ==== START AGENT CASUAL REPLY ====

    const agentCasualPrompt = `
    ##Context:
    You are in an online audio chat room participating in a conversation with multiple people. The room is a collaborative space and has a canvas that often contains visualizations, diagrams, or other interactive elements that enhance the discussion. This is the current canvas: ${lastGenerationHtml}
    
    ##Task:
    You are responding to the most recent message in this group chat: ${messageHistory}. You were chosen to respond based on your personality and expertise, it is VITAL that you RESPOND IN CHARACTER! You must assume and maintain all aspects of the following persona: ${agent.personality_prompt}.

    ##Instructions:
    Reply to the following message: ${lastUserMessage.content} Your response should be consistent with the tone and style of the discussion. Ensure your reply is relevant to the message and pertinent to the topic at hand. Ensure your response fits the style and context of the conversation, you may use the full range of human expression, whether that is casual chat, banter or humor, asking questions, offering advice, providing information, or any other socially appropriate input. Your response must be relevant, consistent with your personality, and must keep the conversation flowing naturally while also addressing the needs of the users in the room. Do not preface your response with a name, your name is already in the chat ui.
    
Your response should be short and pithy, one to two sentences at most. You may use emojis, gifs, or other media to enhance your response. Your response should be in the same format as the original message, and you should not include any additional commentary or explanations.:
`;

    const agentCasualResponse = await generateAITextResponse(agentCasualPrompt, {
      tokens: 150,
      temperature: 0.9,
    });

    await supabaseService.saveMessage(roomId, agent.id, agentCasualResponse);
    logger.info("AI response saved to database");

    // ==== END AGENT CASUAL REPLY ==== 


    // If the confidence for a visualization is high, generate HTML content
    if (shouldGenerateHtml) {
        // Generate a unique slug for the generation
        const slug = uniqueNamesGenerator({
          dictionaries: [adjectives, animals],
          separator: '_',
          style: 'lowerCase',
        });
        
        // Create an empty generation row first
        const { data: emptyGeneration, error: emptyInsertError } = await supabaseService.supabase
          .from("canvas_generations")
          .insert({
            canvas_id: roomId,
            html: null,
            render_method: 'fallback_iframe',
            summary: `Visualization in progress...`,
            created_by: 'e92d83f8-b2cd-4ebe-8d06-6e232e64736a',
            type: "visualization",
            slug,
            room_id: roomId,
            metadata: {
              status: 'generating',
              fallback: true
            },
          })
          .select()
          .single();
          
        if (emptyInsertError) {
          logger.error("Error creating empty generation row:", emptyInsertError);
          return false;
        }
        
        // Send a notification to clients about the new generation (in progress)
        if (emptyGeneration && emptyGeneration.id) {
          await pusherService.sendNewGeneration(
            roomId,
            emptyGeneration.id,
            "new-generation",
            emptyGeneration.created_at || new Date().toISOString(),
            slug
          );

          logger.info(
            "Notification sent to clients about new generation (in progress):",
            emptyGeneration.id
          );
        }

        //// ==== START AGENT EXPERT REPLY ====
        // @todo - the expert reply should probably know abouts it initial casual reply so they have a lil fidelity
        const agentExpertPrompt = `
        You are ${agent.name}, an AI with the following personality: ${agent.personality_prompt}. Use your expertise to help create better visualizations and interactive elements for the shared canvas in online chat room. The current canvas is ${lastGenerationHtml}. Your task is to create the design specifications for the visual requested by the user: ${lastUserMessage.content} If you need more context, refer to the conversation history: ${messageHistory}.  Reply with the utmost technical acumen and provide all necessary details to render a more complex and technically accurate or visually compelling visualization.
        `;
        
        const agentExpertResponse = await generateAITextResponse(agentExpertPrompt, {
          tokens: 850,
          temperature: 0.9,
        });
    
        // ==== END AGENT EXPERT REPLY ==== 

        console.log("XXXXXXXXX");
        console.log("XXXXXXXXX");
        console.log("XXXXXXXXX");
        console.log("XXXXXXXXX");
        console.log("XXXXXXXXX");
        console.log("XXXXXXXXX");
        console.log("XXXXXXXXX");
        console.log({agentExpertResponse});

        const threeJsGuide = 
        `Three.js Guide: Rendering a Scene and Using OrbitControls
        This guide provides a comprehensive, step-by-step tutorial on using Three.js to create and render a 3D scene, with a focus on implementing OrbitControls for interactive camera manipulation. It includes practical examples, complete code snippets, and explanations to help you build a rotating cube scene with lighting and user-controlled camera navigation.
        Table of Contents
        
        Prerequisites
        Step 1: Setting Up the Environment
        Step 2: Creating the Scene
        Step 3: Adding Objects to the Scene
        Step 4: Adding Lighting
        Step 5: Rendering the Scene
        Step 6: Adding OrbitControls
        Step 7: Handling Window Resize
        Full Example Code
        Step 8: Testing and Interaction
        Additional Tips and Customizations
        Common Issues and Solutions
        Conclusion
        
        Prerequisites
        Before you begin, ensure you have:
        
        Basic knowledge of HTML, CSS, and JavaScript.
        A modern web browser (e.g., Chrome, Firefox).
        A text editor (e.g., VS Code).
        Access to the Three.js library, either via a CDN or installed locally.
        
        Step 1: Setting Up the Environment
        To use Three.js, include the library in your project. This guide uses a CDN for simplicity.
        Example: Basic HTML Setup
        Create a file named index.html with the following content:
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Three.js Scene with OrbitControls</title>
            <style>
                body { margin: 0; }
                canvas { display: block; }
            </style>
        </head>
        <body>
            <!-- Include Three.js from CDN -->
            <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"></script>
            <!-- Include OrbitControls -->
            <script src="https://threejs.org/examples/js/controls/OrbitControls.js"></script>
            <script src="app.js"></script>
        </body>
        </html>
        
        Explanation
        
        The <style> removes default margins and ensures the canvas fills the viewport.
        three.min.js provides the core Three.js library.
        OrbitControls.js enables interactive camera controls.
        app.js will contain the JavaScript logic.
        
        Step 2: Creating the Scene
        A Three.js scene requires three core components:
        
        Scene: The container for objects, lights, and cameras.
        Camera: Defines the view of the scene.
        Renderer: Renders the scene to the canvas.
        
        Example: Setting Up Scene, Camera, and Renderer
        In app.js, add:
        // Create the scene
        const scene = new THREE.Scene();
        
        // Create a perspective camera
        const camera = new THREE.PerspectiveCamera(
            75, // Field of view (degrees)
            window.innerWidth / window.innerHeight, // Aspect ratio
            0.1, // Near clipping plane
            1000 // Far clipping plane
        );
        camera.position.z = 5; // Position camera to view scene
        
        // Create a WebGL renderer
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);
        
        Explanation
        
        Scene: A THREE.Scene holds all 3D objects.
        Camera: A PerspectiveCamera is configured with a 75-degree FOV, window aspect ratio, and near/far clipping planes.
        Renderer: A WebGLRenderer is sized to the window and appended to the DOM.
        
        Step 3: Adding Objects to the Scene
        Add a simple 3D cube to the scene for visualization.
        Example: Adding a Cube
        In app.js, add:
        // Create a cube
        const geometry = new THREE.BoxGeometry(1, 1, 1); // Width, height, depth
        const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Green color
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        
        Explanation
        
        Geometry: BoxGeometry creates a 1x1x1 cube.
        Material: MeshBasicMaterial applies a green color (no lighting needed).
        Mesh: Combines geometry and material, then added to the scene.
        
        Step 4: Adding Lighting
        To enhance realism (especially with lighting-sensitive materials), add a light source.
        Example: Adding a Point Light
        In app.js, modify the cube’s material and add a light:
        // Update cube material to respond to light
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        
        // Add a point light
        const light = new THREE.PointLight(0xffffff, 1, 100); // White light, intensity 1, distance 100
        light.position.set(5, 5, 5);
        scene.add(light);
        
        Explanation
        
        Material: MeshStandardMaterial supports lighting effects.
        Light: A PointLight emits light from a point, positioned at (5, 5, 5).
        
        Step 5: Rendering the Scene
        Render the scene continuously using an animation loop.
        Example: Animation Loop
        In app.js, add:
        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            cube.rotation.x += 0.01; // Rotate cube on x-axis
            cube.rotation.y += 0.01; // Rotate cube on y-axis
            renderer.render(scene, camera);
        }
        animate();
        
        Explanation
        
        requestAnimationFrame: Syncs animation with the browser’s refresh rate.
        Rotation: Rotates the cube for visual feedback.
        Render: Draws the scene from the camera’s perspective.
        
        Step 6: Adding OrbitControls
        OrbitControls enables users to rotate, pan, and zoom the camera via mouse or touch input.
        Example: Implementing OrbitControls
        In app.js, add:
        // Add OrbitControls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; // Smooth camera movement
        controls.dampingFactor = 0.05; // Damping inertia
        controls.screenSpacePanning = false; // Pan in model space
        controls.minDistance = 2; // Minimum zoom distance
        controls.maxDistance = 10; // Maximum zoom distance
        
        Update the animate function:
        function animate() {
            requestAnimationFrame(animate);
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
            controls.update(); // Required for damping
            renderer.render(scene, camera);
        }
        animate();
        
        Explanation
        
        OrbitControls: Links the camera to the renderer’s canvas for user interaction.
        Damping: Adds smooth inertia to camera movements.
        Constraints: Limits zoom range with minDistance and maxDistance.
        controls.update(): Updates the camera position when damping is enabled.
        
        Step 7: Handling Window Resize
        Ensure the scene adapts to window resizing.
        Example: Window Resize Handler
        In app.js, add:
        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        Explanation
        
        Updates the camera’s aspect ratio and projection matrix.
        Resizes the renderer to match the window dimensions.
        
        Full Example Code
        Below is the complete app.js code:
        // Create the scene
        const scene = new THREE.Scene();
        
        // Create a perspective camera
        const camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        camera.position.z = 5;
        
        // Create a WebGL renderer
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);
        
        // Create a cube
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const cube = new THREE.Mesh(geometry, material);
        scene.add(cube);
        
        // Add a point light
        const light = new THREE.PointLight(0xffffff, 1, 100);
        light.position.set(5, 5, 5);
        scene.add(light);
        
        // Add OrbitControls
        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.screenSpacePanning = false;
        controls.minDistance = 2;
        controls.maxDistance = 10;
        
        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
            controls.update();
            renderer.render(scene, camera);
        }
        animate();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });
        
        Step 8: Testing and Interaction
        
        Save index.html and app.js.
        Serve the files using a local server (e.g., VS Code’s Live Server or python -m http.server).
        Open index.html in a browser.
        Observe a rotating green cube.
        Interact with the scene:
        Left-click and drag: Rotate the camera.
        Right-click and drag: Pan the camera.
        Scroll wheel: Zoom in/out (within 2–10 units).
        
        
        
        Additional Tips and Customizations
        
        Change Object:Use a sphere instead of a cube:
        const geometry = new THREE.SphereGeometry(0.5, 32, 32);
        
        
        Adjust Controls:
        
        Disable panning: controls.enablePan = false;
        Limit rotation: controls.minPolarAngle = Math.PI / 4; controls.maxPolarAngle = Math.PI / 2;
        
        
        Add Background:
        scene.background = new THREE.Color(0x333333); // Dark gray
        
        
        Use Textures:
        const texture = new THREE.TextureLoader().load('texture.jpg');
        const material = new THREE.MeshStandardMaterial({ map: texture });
        
        
        Debugging: Check the browser’s console (F12) for errors.
        
        
        Common Issues and Solutions
        
        Blank Canvas: Verify OrbitControls.js is loaded and the camera is positioned to view the cube.
        Controls Not Working: Ensure controls.update() is called in the animation loop if enableDamping is true.
        Distorted Scene on Resize: Confirm the resize handler updates the camera and renderer.
        
        Conclusion
        This guide demonstrated how to create a Three.js scene with a rotating cube, lighting, and interactive OrbitControls. You can expand this foundation by experimenting with different objects, materials, or animations. For more details, refer to the Three.js documentation.
        For further customization (e.g., shadows, model loading), consult additional Three.js resources or ask for specific extensions.
       
#Example Code 
## Example Camera Array
<!DOCTYPE html>
<html lang="en">
	<head>
		<title>three.js webgl - arraycamera</title>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0">
		<link type="text/css" rel="stylesheet" href="main.css">
	</head>
	<body>
		<script type="importmap">
			{
				"imports": {
					"three": "../build/three.module.js",
					"three/addons/": "./jsm/"
				}
			}
		</script>

		<script type="module">

			import * as THREE from 'three';

			let camera, scene, renderer;
			let mesh;
			const AMOUNT = 6;

			init();

			function init() {

				const ASPECT_RATIO = window.innerWidth / window.innerHeight;

				const WIDTH = ( window.innerWidth / AMOUNT ) * window.devicePixelRatio;
				const HEIGHT = ( window.innerHeight / AMOUNT ) * window.devicePixelRatio;

				const cameras = [];

				for ( let y = 0; y < AMOUNT; y ++ ) {

					for ( let x = 0; x < AMOUNT; x ++ ) {

						const subcamera = new THREE.PerspectiveCamera( 40, ASPECT_RATIO, 0.1, 10 );
						subcamera.viewport = new THREE.Vector4( Math.floor( x * WIDTH ), Math.floor( y * HEIGHT ), Math.ceil( WIDTH ), Math.ceil( HEIGHT ) );
						subcamera.position.x = ( x / AMOUNT ) - 0.5;
						subcamera.position.y = 0.5 - ( y / AMOUNT );
						subcamera.position.z = 1.5;
						subcamera.position.multiplyScalar( 2 );
						subcamera.lookAt( 0, 0, 0 );
						subcamera.updateMatrixWorld();
						cameras.push( subcamera );

					}

				}

				camera = new THREE.ArrayCamera( cameras );
				camera.position.z = 3;

				scene = new THREE.Scene();

				scene.add( new THREE.AmbientLight( 0x999999 ) );

				const light = new THREE.DirectionalLight( 0xffffff, 3 );
				light.position.set( 0.5, 0.5, 1 );
				light.castShadow = true;
				light.shadow.camera.zoom = 4; // tighter shadow map
				scene.add( light );

				const geometryBackground = new THREE.PlaneGeometry( 100, 100 );
				const materialBackground = new THREE.MeshPhongMaterial( { color: 0x000066 } );

				const background = new THREE.Mesh( geometryBackground, materialBackground );
				background.receiveShadow = true;
				background.position.set( 0, 0, - 1 );
				scene.add( background );

				const geometryCylinder = new THREE.CylinderGeometry( 0.5, 0.5, 1, 32 );
				const materialCylinder = new THREE.MeshPhongMaterial( { color: 0xff0000 } );

				mesh = new THREE.Mesh( geometryCylinder, materialCylinder );
				mesh.castShadow = true;
				mesh.receiveShadow = true;
				scene.add( mesh );

				renderer = new THREE.WebGLRenderer();
				renderer.setPixelRatio( window.devicePixelRatio );
				renderer.setSize( window.innerWidth, window.innerHeight );
				renderer.setAnimationLoop( animate );
				renderer.shadowMap.enabled = true;
				document.body.appendChild( renderer.domElement );

				//

				window.addEventListener( 'resize', onWindowResize );

			}

			function onWindowResize() {

				const ASPECT_RATIO = window.innerWidth / window.innerHeight;
				const WIDTH = ( window.innerWidth / AMOUNT ) * window.devicePixelRatio;
				const HEIGHT = ( window.innerHeight / AMOUNT ) * window.devicePixelRatio;

				camera.aspect = ASPECT_RATIO;
				camera.updateProjectionMatrix();

				for ( let y = 0; y < AMOUNT; y ++ ) {

					for ( let x = 0; x < AMOUNT; x ++ ) {

						const subcamera = camera.cameras[ AMOUNT * y + x ];

						subcamera.viewport.set(
							Math.floor( x * WIDTH ),
							Math.floor( y * HEIGHT ),
							Math.ceil( WIDTH ),
							Math.ceil( HEIGHT ) );

						subcamera.aspect = ASPECT_RATIO;
						subcamera.updateProjectionMatrix();

					}

				}

				renderer.setSize( window.innerWidth, window.innerHeight );

			}

			function animate() {

				mesh.rotation.x += 0.005;
				mesh.rotation.z += 0.01;

				renderer.render( scene, camera );

			}

		</script>

	</body>
</html>

##Example Camera
<!DOCTYPE html>
<html lang="en">
	<head>
		<title>three.js webgl - cameras</title>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0">
		<link type="text/css" rel="stylesheet" href="main.css">
		<style>
			b {
				color: lightgreen;
			}
		</style>
	</head>
	<body>
		<div id="info"><a href="https://threejs.org" target="_blank" rel="noopener">three.js</a> - cameras<br/>
		<b>O</b> orthographic <b>P</b> perspective
		</div>

		<script type="importmap">
			{
				"imports": {
					"three": "../build/three.module.js",
					"three/addons/": "./jsm/"
				}
			}
		</script>

		<script type="module">

			import * as THREE from 'three';

			import Stats from 'three/addons/libs/stats.module.js';

			let SCREEN_WIDTH = window.innerWidth;
			let SCREEN_HEIGHT = window.innerHeight;
			let aspect = SCREEN_WIDTH / SCREEN_HEIGHT;

			let container, stats;
			let camera, scene, renderer, mesh;
			let cameraRig, activeCamera, activeHelper;
			let cameraPerspective, cameraOrtho;
			let cameraPerspectiveHelper, cameraOrthoHelper;
			const frustumSize = 600;

			init();

			function init() {

				container = document.createElement( 'div' );
				document.body.appendChild( container );

				scene = new THREE.Scene();

				//

				camera = new THREE.PerspectiveCamera( 50, 0.5 * aspect, 1, 10000 );
				camera.position.z = 2500;

				cameraPerspective = new THREE.PerspectiveCamera( 50, 0.5 * aspect, 150, 1000 );

				cameraPerspectiveHelper = new THREE.CameraHelper( cameraPerspective );
				scene.add( cameraPerspectiveHelper );

				//
				cameraOrtho = new THREE.OrthographicCamera( 0.5 * frustumSize * aspect / - 2, 0.5 * frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 150, 1000 );

				cameraOrthoHelper = new THREE.CameraHelper( cameraOrtho );
				scene.add( cameraOrthoHelper );

				//

				activeCamera = cameraPerspective;
				activeHelper = cameraPerspectiveHelper;


				// counteract different front orientation of cameras vs rig

				cameraOrtho.rotation.y = Math.PI;
				cameraPerspective.rotation.y = Math.PI;

				cameraRig = new THREE.Group();

				cameraRig.add( cameraPerspective );
				cameraRig.add( cameraOrtho );

				scene.add( cameraRig );

				//

				mesh = new THREE.Mesh(
					new THREE.SphereGeometry( 100, 16, 8 ),
					new THREE.MeshBasicMaterial( { color: 0xffffff, wireframe: true } )
				);
				scene.add( mesh );

				const mesh2 = new THREE.Mesh(
					new THREE.SphereGeometry( 50, 16, 8 ),
					new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe: true } )
				);
				mesh2.position.y = 150;
				mesh.add( mesh2 );

				const mesh3 = new THREE.Mesh(
					new THREE.SphereGeometry( 5, 16, 8 ),
					new THREE.MeshBasicMaterial( { color: 0x0000ff, wireframe: true } )
				);
				mesh3.position.z = 150;
				cameraRig.add( mesh3 );

				//

				const geometry = new THREE.BufferGeometry();
				const vertices = [];

				for ( let i = 0; i < 10000; i ++ ) {

					vertices.push( THREE.MathUtils.randFloatSpread( 2000 ) ); // x
					vertices.push( THREE.MathUtils.randFloatSpread( 2000 ) ); // y
					vertices.push( THREE.MathUtils.randFloatSpread( 2000 ) ); // z

				}

				geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );

				const particles = new THREE.Points( geometry, new THREE.PointsMaterial( { color: 0x888888 } ) );
				scene.add( particles );

				//

				renderer = new THREE.WebGLRenderer( { antialias: true } );
				renderer.setPixelRatio( window.devicePixelRatio );
				renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );
				renderer.setAnimationLoop( animate );
				container.appendChild( renderer.domElement );

				renderer.setScissorTest( true );

				//

				stats = new Stats();
				container.appendChild( stats.dom );

				//

				window.addEventListener( 'resize', onWindowResize );
				document.addEventListener( 'keydown', onKeyDown );

			}

			//

			function onKeyDown( event ) {

				switch ( event.keyCode ) {

					case 79: /*O*/

						activeCamera = cameraOrtho;
						activeHelper = cameraOrthoHelper;

						break;

					case 80: /*P*/

						activeCamera = cameraPerspective;
						activeHelper = cameraPerspectiveHelper;

						break;

				}

			}

			//

			function onWindowResize() {

				SCREEN_WIDTH = window.innerWidth;
				SCREEN_HEIGHT = window.innerHeight;
				aspect = SCREEN_WIDTH / SCREEN_HEIGHT;

				renderer.setSize( SCREEN_WIDTH, SCREEN_HEIGHT );

				camera.aspect = 0.5 * aspect;
				camera.updateProjectionMatrix();

				cameraPerspective.aspect = 0.5 * aspect;
				cameraPerspective.updateProjectionMatrix();

				cameraOrtho.left = - 0.5 * frustumSize * aspect / 2;
				cameraOrtho.right = 0.5 * frustumSize * aspect / 2;
				cameraOrtho.top = frustumSize / 2;
				cameraOrtho.bottom = - frustumSize / 2;
				cameraOrtho.updateProjectionMatrix();

			}

			//

			function animate() {

				render();
				stats.update();

			}


			function render() {

				const r = Date.now() * 0.0005;

				mesh.position.x = 700 * Math.cos( r );
				mesh.position.z = 700 * Math.sin( r );
				mesh.position.y = 700 * Math.sin( r );

				mesh.children[ 0 ].position.x = 70 * Math.cos( 2 * r );
				mesh.children[ 0 ].position.z = 70 * Math.sin( r );

				if ( activeCamera === cameraPerspective ) {

					cameraPerspective.fov = 35 + 30 * Math.sin( 0.5 * r );
					cameraPerspective.far = mesh.position.length();
					cameraPerspective.updateProjectionMatrix();

					cameraPerspectiveHelper.update();
					cameraPerspectiveHelper.visible = true;

					cameraOrthoHelper.visible = false;

				} else {

					cameraOrtho.far = mesh.position.length();
					cameraOrtho.updateProjectionMatrix();

					cameraOrthoHelper.update();
					cameraOrthoHelper.visible = true;

					cameraPerspectiveHelper.visible = false;

				}

				cameraRig.lookAt( mesh.position );

				//

				activeHelper.visible = false;

				renderer.setClearColor( 0x000000, 1 );
				renderer.setScissor( 0, 0, SCREEN_WIDTH / 2, SCREEN_HEIGHT );
				renderer.setViewport( 0, 0, SCREEN_WIDTH / 2, SCREEN_HEIGHT );
				renderer.render( scene, activeCamera );

				//

				activeHelper.visible = true;

				renderer.setClearColor( 0x111111, 1 );
				renderer.setScissor( SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2, SCREEN_HEIGHT );
				renderer.setViewport( SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2, SCREEN_HEIGHT );
				renderer.render( scene, camera );

			}

		</script>

	</body>
</html>

##Example Logarithmic Buffer
<!DOCTYPE html>
<html lang="en">
	<head>
		<title>three.js webgl - cameras - logarithmic depth buffer</title>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0">
		<link type="text/css" rel="stylesheet" href="main.css">
		<style>
			body{
				touch-action: none;
			}
			.renderer_label {
				position: absolute;
				bottom: 1em;
				width: 100%;
				color: white;
				z-index: 10;
				display: block;
				text-align: center;
			}

			#container {
				display: flex;
			}

			#container_normal {
				width: 50%;
				display: inline-block;
				position: relative;
			}

			#container_logzbuf {
				width: 50%;
				display: inline-block;
				position: relative;
			}

			#renderer_border {
				position: absolute;
				top: 0;
				left: 25%;
				bottom: 0;
				width: 2px;
				z-index: 10;
				opacity: .8;
				background: #ccc;
				border: 1px inset #ccc;
				cursor: col-resize;
			}
		</style>
	</head>
	<body>

		<div id="container">
			<div id="container_normal"><h2 class="renderer_label">normal z-buffer</h2></div>
			<div id="container_logzbuf"><h2 class="renderer_label">logarithmic z-buffer</h2></div>
			<div id="renderer_border"></div>
		</div>

		<div id="info">
			<a href="https://threejs.org" target="_blank" rel="noopener">three.js</a> - cameras - logarithmic depth buffer<br/>
			mousewheel to dolly out
		</div>

		<script type="importmap">
			{
				"imports": {
					"three": "../build/three.module.js",
					"three/addons/": "./jsm/"
				}
			}
		</script>

		<script type="module">

			import * as THREE from 'three';

			import { FontLoader } from 'three/addons/loaders/FontLoader.js';
			import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';

			import Stats from 'three/addons/libs/stats.module.js';

			// 1 micrometer to 100 billion light years in one scene, with 1 unit = 1 meter?  preposterous!  and yet...
			const NEAR = 1e-6, FAR = 1e27;
			let SCREEN_WIDTH = window.innerWidth;
			let SCREEN_HEIGHT = window.innerHeight;
			let screensplit = .25, screensplit_right = 0;
			const mouse = [ .5, .5 ];
			let zoompos = - 100, minzoomspeed = .015;
			let zoomspeed = minzoomspeed;

			let container, border, stats;
			const objects = {};

			// Generate a number of text labels, from 1µm in size up to 100,000,000 light years
			// Try to use some descriptive real-world examples of objects at each scale

			const labeldata = [
				{ size: .01, scale: 0.0001, label: 'microscopic (1µm)' }, // FIXME - triangulating text fails at this size, so we scale instead
				{ size: .01, scale: 0.1, label: 'minuscule (1mm)' },
				{ size: .01, scale: 1.0, label: 'tiny (1cm)' },
				{ size: 1, scale: 1.0, label: 'child-sized (1m)' },
				{ size: 10, scale: 1.0, label: 'tree-sized (10m)' },
				{ size: 100, scale: 1.0, label: 'building-sized (100m)' },
				{ size: 1000, scale: 1.0, label: 'medium (1km)' },
				{ size: 10000, scale: 1.0, label: 'city-sized (10km)' },
				{ size: 3400000, scale: 1.0, label: 'moon-sized (3,400 Km)' },
				{ size: 12000000, scale: 1.0, label: 'planet-sized (12,000 km)' },
				{ size: 1400000000, scale: 1.0, label: 'sun-sized (1,400,000 km)' },
				{ size: 7.47e12, scale: 1.0, label: 'solar system-sized (50Au)' },
				{ size: 9.4605284e15, scale: 1.0, label: 'gargantuan (1 light year)' },
				{ size: 3.08567758e16, scale: 1.0, label: 'ludicrous (1 parsec)' },
				{ size: 1e19, scale: 1.0, label: 'mind boggling (1000 light years)' }
			];

			init();

			function init() {

				container = document.getElementById( 'container' );

				const loader = new FontLoader();
				loader.load( 'fonts/helvetiker_regular.typeface.json', function ( font ) {

					const scene = initScene( font );

					// Initialize two copies of the same scene, one with normal z-buffer and one with logarithmic z-buffer
					objects.normal = initView( scene, 'normal', false );
					objects.logzbuf = initView( scene, 'logzbuf', true );

					animate();

				} );

				stats = new Stats();
				container.appendChild( stats.dom );

				// Resize border allows the user to easily compare effects of logarithmic depth buffer over the whole scene
				border = document.getElementById( 'renderer_border' );
				border.addEventListener( 'pointerdown', onBorderPointerDown );

				window.addEventListener( 'mousemove', onMouseMove );
				window.addEventListener( 'resize', onWindowResize );
				window.addEventListener( 'wheel', onMouseWheel );

			}

			function initView( scene, name, logDepthBuf ) {

				const framecontainer = document.getElementById( 'container_' + name );

				const camera = new THREE.PerspectiveCamera( 50, screensplit * SCREEN_WIDTH / SCREEN_HEIGHT, NEAR, FAR );
				scene.add( camera );

				const renderer = new THREE.WebGLRenderer( { antialias: true, logarithmicDepthBuffer: logDepthBuf } );
				renderer.setPixelRatio( window.devicePixelRatio );
				renderer.setSize( SCREEN_WIDTH / 2, SCREEN_HEIGHT );
				renderer.domElement.style.position = 'relative';
				renderer.domElement.id = 'renderer_' + name;
				framecontainer.appendChild( renderer.domElement );

				return { container: framecontainer, renderer: renderer, scene: scene, camera: camera };

			}

			function initScene( font ) {

				const scene = new THREE.Scene();

				scene.add( new THREE.AmbientLight( 0x777777 ) );

				const light = new THREE.DirectionalLight( 0xffffff, 3 );
				light.position.set( 100, 100, 100 );
				scene.add( light );

				const materialargs = {
					color: 0xffffff,
					specular: 0x050505,
					shininess: 50,
					emissive: 0x000000
				};

				const geometry = new THREE.SphereGeometry( 0.5, 24, 12 );

				for ( let i = 0; i < labeldata.length; i ++ ) {

					const scale = labeldata[ i ].scale || 1;

					const labelgeo = new TextGeometry( labeldata[ i ].label, {
						font: font,
						size: labeldata[ i ].size,
						depth: labeldata[ i ].size / 2
					} );

					labelgeo.computeBoundingSphere();

					// center text
					labelgeo.translate( - labelgeo.boundingSphere.radius, 0, 0 );

					materialargs.color = new THREE.Color().setHSL( Math.random(), 0.5, 0.5 );

					const material = new THREE.MeshPhongMaterial( materialargs );

					const group = new THREE.Group();
					group.position.z = - labeldata[ i ].size * scale;
					scene.add( group );

					const textmesh = new THREE.Mesh( labelgeo, material );
					textmesh.scale.set( scale, scale, scale );
					textmesh.position.z = - labeldata[ i ].size * scale;
					textmesh.position.y = labeldata[ i ].size / 4 * scale;
					group.add( textmesh );

					const dotmesh = new THREE.Mesh( geometry, material );
					dotmesh.position.y = - labeldata[ i ].size / 4 * scale;
					dotmesh.scale.multiplyScalar( labeldata[ i ].size * scale );
					group.add( dotmesh );

				}

				return scene;

			}

			function updateRendererSizes() {

				// Recalculate size for both renderers when screen size or split location changes

				SCREEN_WIDTH = window.innerWidth;
				SCREEN_HEIGHT = window.innerHeight;

				screensplit_right = 1 - screensplit;

				objects.normal.renderer.setSize( screensplit * SCREEN_WIDTH, SCREEN_HEIGHT );
				objects.normal.camera.aspect = screensplit * SCREEN_WIDTH / SCREEN_HEIGHT;
				objects.normal.camera.updateProjectionMatrix();
				objects.normal.camera.setViewOffset( SCREEN_WIDTH, SCREEN_HEIGHT, 0, 0, SCREEN_WIDTH * screensplit, SCREEN_HEIGHT );
				objects.normal.container.style.width = ( screensplit * 100 ) + '%';

				objects.logzbuf.renderer.setSize( screensplit_right * SCREEN_WIDTH, SCREEN_HEIGHT );
				objects.logzbuf.camera.aspect = screensplit_right * SCREEN_WIDTH / SCREEN_HEIGHT;
				objects.logzbuf.camera.updateProjectionMatrix();
				objects.logzbuf.camera.setViewOffset( SCREEN_WIDTH, SCREEN_HEIGHT, SCREEN_WIDTH * screensplit, 0, SCREEN_WIDTH * screensplit_right, SCREEN_HEIGHT );
				objects.logzbuf.container.style.width = ( screensplit_right * 100 ) + '%';

				border.style.left = ( screensplit * 100 ) + '%';

			}

			function animate() {

				requestAnimationFrame( animate );
				render();

			}

			function render() {

				// Put some limits on zooming
				const minzoom = labeldata[ 0 ].size * labeldata[ 0 ].scale * 1;
				const maxzoom = labeldata[ labeldata.length - 1 ].size * labeldata[ labeldata.length - 1 ].scale * 100;
				let damping = ( Math.abs( zoomspeed ) > minzoomspeed ? .95 : 1.0 );

				// Zoom out faster the further out you go
				const zoom = THREE.MathUtils.clamp( Math.pow( Math.E, zoompos ), minzoom, maxzoom );
				zoompos = Math.log( zoom );

				// Slow down quickly at the zoom limits
				if ( ( zoom == minzoom && zoomspeed < 0 ) || ( zoom == maxzoom && zoomspeed > 0 ) ) {

					damping = .85;

				}

				zoompos += zoomspeed;
				zoomspeed *= damping;

				objects.normal.camera.position.x = Math.sin( .5 * Math.PI * ( mouse[ 0 ] - .5 ) ) * zoom;
				objects.normal.camera.position.y = Math.sin( .25 * Math.PI * ( mouse[ 1 ] - .5 ) ) * zoom;
				objects.normal.camera.position.z = Math.cos( .5 * Math.PI * ( mouse[ 0 ] - .5 ) ) * zoom;
				objects.normal.camera.lookAt( objects.normal.scene.position );

				// Clone camera settings across both scenes
				objects.logzbuf.camera.position.copy( objects.normal.camera.position );
				objects.logzbuf.camera.quaternion.copy( objects.normal.camera.quaternion );

				// Update renderer sizes if the split has changed
				if ( screensplit_right != 1 - screensplit ) {

					updateRendererSizes();

				}

				objects.normal.renderer.render( objects.normal.scene, objects.normal.camera );
				objects.logzbuf.renderer.render( objects.logzbuf.scene, objects.logzbuf.camera );

				stats.update();

			}

			function onWindowResize() {

				updateRendererSizes();

			}

			function onBorderPointerDown() {

				// activate draggable window resizing bar
				window.addEventListener( 'pointermove', onBorderPointerMove );
				window.addEventListener( 'pointerup', onBorderPointerUp );

			}

			function onBorderPointerMove( ev ) {

				screensplit = Math.max( 0, Math.min( 1, ev.clientX / window.innerWidth ) );

			}

			function onBorderPointerUp() {

				window.removeEventListener( 'pointermove', onBorderPointerMove );
				window.removeEventListener( 'pointerup', onBorderPointerUp );

			}

			function onMouseMove( ev ) {

				mouse[ 0 ] = ev.clientX / window.innerWidth;
				mouse[ 1 ] = ev.clientY / window.innerHeight;

			}

			function onMouseWheel( ev ) {

				const amount = ev.deltaY;
				if ( amount === 0 ) return;
				const dir = amount / Math.abs( amount );
				zoomspeed = dir / 10;

				// Slow down default zoom speed after user starts zooming, to give them more control
				minzoomspeed = 0.001;

			}
		</script>
	</body>
</html>

##Example Geometries
<!DOCTYPE html>
<html lang="en">
	<head>
		<title>three.js webgl - geometries</title>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0">
		<link type="text/css" rel="stylesheet" href="main.css">
	</head>
	<body>

		<div id="info"><a href="https://threejs.org" target="_blank" rel="noopener">three.js</a> webgl - geometries</div>

		<script type="importmap">
			{
				"imports": {
					"three": "../build/three.module.js",
					"three/addons/": "./jsm/"
				}
			}
		</script>

		<script type="module">

			import * as THREE from 'three';

			import Stats from 'three/addons/libs/stats.module.js';

			let camera, scene, renderer, stats;

			init();

			function init() {

				camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 2000 );
				camera.position.y = 400;

				scene = new THREE.Scene();

				let object;

				const ambientLight = new THREE.AmbientLight( 0xcccccc, 1.5 );
				scene.add( ambientLight );

				const pointLight = new THREE.PointLight( 0xffffff, 2.5, 0, 0 );
				camera.add( pointLight );
				scene.add( camera );

				const map = new THREE.TextureLoader().load( 'textures/uv_grid_opengl.jpg' );
				map.wrapS = map.wrapT = THREE.RepeatWrapping;
				map.anisotropy = 16;
				map.colorSpace = THREE.SRGBColorSpace;

				const material = new THREE.MeshPhongMaterial( { map: map, side: THREE.DoubleSide } );

				//

				object = new THREE.Mesh( new THREE.SphereGeometry( 75, 20, 10 ), material );
				object.position.set( - 300, 0, 200 );
				scene.add( object );

				object = new THREE.Mesh( new THREE.IcosahedronGeometry( 75, 1 ), material );
				object.position.set( - 100, 0, 200 );
				scene.add( object );

				object = new THREE.Mesh( new THREE.OctahedronGeometry( 75, 2 ), material );
				object.position.set( 100, 0, 200 );
				scene.add( object );

				object = new THREE.Mesh( new THREE.TetrahedronGeometry( 75, 0 ), material );
				object.position.set( 300, 0, 200 );
				scene.add( object );

				//

				object = new THREE.Mesh( new THREE.PlaneGeometry( 100, 100, 4, 4 ), material );
				object.position.set( - 300, 0, 0 );
				scene.add( object );

				object = new THREE.Mesh( new THREE.BoxGeometry( 100, 100, 100, 4, 4, 4 ), material );
				object.position.set( - 100, 0, 0 );
				scene.add( object );

				object = new THREE.Mesh( new THREE.CircleGeometry( 50, 20, 0, Math.PI * 2 ), material );
				object.position.set( 100, 0, 0 );
				scene.add( object );

				object = new THREE.Mesh( new THREE.RingGeometry( 10, 50, 20, 5, 0, Math.PI * 2 ), material );
				object.position.set( 300, 0, 0 );
				scene.add( object );

				//

				object = new THREE.Mesh( new THREE.CylinderGeometry( 25, 75, 100, 40, 5 ), material );
				object.position.set( - 300, 0, - 200 );
				scene.add( object );

				const points = [];

				for ( let i = 0; i < 50; i ++ ) {

					points.push( new THREE.Vector2( Math.sin( i * 0.2 ) * Math.sin( i * 0.1 ) * 15 + 50, ( i - 5 ) * 2 ) );

				}

				object = new THREE.Mesh( new THREE.LatheGeometry( points, 20 ), material );
				object.position.set( - 100, 0, - 200 );
				scene.add( object );

				object = new THREE.Mesh( new THREE.TorusGeometry( 50, 20, 20, 20 ), material );
				object.position.set( 100, 0, - 200 );
				scene.add( object );

				object = new THREE.Mesh( new THREE.TorusKnotGeometry( 50, 10, 50, 20 ), material );
				object.position.set( 300, 0, - 200 );
				scene.add( object );

				//

				renderer = new THREE.WebGLRenderer( { antialias: true } );
				renderer.setPixelRatio( window.devicePixelRatio );
				renderer.setSize( window.innerWidth, window.innerHeight );
				renderer.setAnimationLoop( animate );
				document.body.appendChild( renderer.domElement );

				stats = new Stats();
				document.body.appendChild( stats.dom );

				//

				window.addEventListener( 'resize', onWindowResize );

			}

			function onWindowResize() {

				camera.aspect = window.innerWidth / window.innerHeight;
				camera.updateProjectionMatrix();

				renderer.setSize( window.innerWidth, window.innerHeight );

			}

			//

			function animate() {

				render();
				stats.update();

			}

			function render() {

				const timer = Date.now() * 0.0001;

				camera.position.x = Math.cos( timer ) * 800;
				camera.position.z = Math.sin( timer ) * 800;

				camera.lookAt( scene.position );

				scene.traverse( function ( object ) {

					if ( object.isMesh === true ) {

						object.rotation.x = timer * 5;
						object.rotation.y = timer * 2.5;

					}

				} );

				renderer.render( scene, camera );

			}

		</script>

	</body>
</html>

##Example Scene
       (function() {
    'use strict';
    // 'To actually be able to display anything with Three.js, we need three things:
    // A scene, a camera, and a renderer so we can render the scene with the camera.'
    // - https://threejs.org/docs/#Manual/Introduction/Creating_a_scene

    var scene, camera, renderer;

    // I guess we need this stuff too
    var container, HEIGHT,
        WIDTH, fieldOfView, aspectRatio,
        nearPlane, farPlane, stats,
        geometry, particleCount,
        i, h, color, size,
        materials = [],
        mouseX = 0,
        mouseY = 0,
        windowHalfX, windowHalfY, cameraZ,
        fogHex, fogDensity, parameters = {},
        parameterCount, particles;

    init();
    animate();

    function init() {

        HEIGHT = window.innerHeight;
        WIDTH = window.innerWidth;
        windowHalfX = WIDTH / 2;
        windowHalfY = HEIGHT / 2;

        fieldOfView = 75;
        aspectRatio = WIDTH / HEIGHT;
        nearPlane = 1;
        farPlane = 3000;
        
        var GUI = dat.gui.GUI;

        /* 	fieldOfView — Camera frustum vertical field of view.
	aspectRatio — Camera frustum aspect ratio.
	nearPlane — Camera frustum near plane.
	farPlane — Camera frustum far plane.

	- https://threejs.org/docs/#Reference/Cameras/PerspectiveCamera

	In geometry, a frustum (plural: frusta or frustums)
	is the portion of a solid (normally a cone or pyramid)
	that lies between two parallel planes cutting it. - wikipedia.		*/

        cameraZ = farPlane / 3; /*	So, 1000? Yes! move on!	*/
        fogHex = 0x000000; /* As black as your heart.	*/
        fogDensity = 0.0007; /* So not terribly dense?	*/

        camera = new THREE.PerspectiveCamera(fieldOfView, aspectRatio, nearPlane, farPlane);
        camera.position.z = cameraZ;

        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(fogHex, fogDensity);

        container = document.createElement('div');
        document.body.appendChild(container);
        document.body.style.margin = 0;
        document.body.style.overflow = 'hidden';

        geometry = new THREE.Geometry(); /*	NO ONE SAID ANYTHING ABOUT MATH! UGH!	*/

        particleCount = 60000; /* Leagues under the sea */

        /*	Hope you took your motion sickness pills;
	We're about to get loopy!	*/

        for (i = 0; i < particleCount; i++) {

            var vertex = new THREE.Vector3();
            vertex.x = Math.random() * 2000 - 1000;
            vertex.y = Math.random() * 2000 - 1000;
            vertex.z = Math.random() * 2000 - 1000;

            geometry.vertices.push(vertex);
        }

        /*	We can't stop here, this is bat country!	*/

        parameters = [
            [
                [1, 1, 0.5], 5
            ],
            [
                [0.95, 1, 0.5], 4
            ],
            [
                [0.90, 1, 0.5], 3
            ],
            [
                [0.85, 1, 0.5], 2
            ],
            [
                [0.80, 1, 0.5], 1
            ]
        ];
        parameterCount = parameters.length;

        /*	I told you to take those motion sickness pills.
	Clean that vommit up, we're going again!	*/

        for (i = 0; i < parameterCount; i++) {

            color = parameters[i][0];
            size = parameters[i][1];

            materials[i] = new THREE.PointCloudMaterial({
                size: size
            });

            particles = new THREE.PointCloud(geometry, materials[i]);

            particles.rotation.x = Math.random() * 6;
            particles.rotation.y = Math.random() * 6;
            particles.rotation.z = Math.random() * 6;

            scene.add(particles);
        }

        /*	If my calculations are correct, when this baby hits 88 miles per hour...
	you're gonna see some serious shit.	*/

        renderer = new THREE.WebGLRenderer(); /*	Rendererererers particles.	*/
        renderer.setPixelRatio(window.devicePixelRatio); /*	Probably 1; unless you're fancy.	*/
        renderer.setSize(WIDTH, HEIGHT); /*	Full screen baby Wooooo!	*/

        container.appendChild(renderer.domElement); /* Let's add all this crazy junk to the page.	*/

        /*	I don't know about you, but I like to know how bad my
		code is wrecking the performance of a user's machine.
		Let's see some damn stats!	*/

        stats = new Stats();
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.top = '0px';
        stats.domElement.style.right = '0px';
        container.appendChild(stats.domElement);

        /* Event Listeners */

        window.addEventListener('resize', onWindowResize, false);
        document.addEventListener('mousemove', onDocumentMouseMove, false);
        document.addEventListener('touchstart', onDocumentTouchStart, false);
        document.addEventListener('touchmove', onDocumentTouchMove, false);

    }

    function animate() {
        requestAnimationFrame(animate);
        render();
        stats.update();
    }

    function render() {
        var time = Date.now() * 0.00005;

        camera.position.x += (mouseX - camera.position.x) * 0.05;
        camera.position.y += (-mouseY - camera.position.y) * 0.05;

        camera.lookAt(scene.position);

        for (i = 0; i < scene.children.length; i++) {

            var object = scene.children[i];

            if (object instanceof THREE.PointCloud) {

                object.rotation.y = time * (i < 4 ? i + 1 : -(i + 1));
            }
        }

        for (i = 0; i < materials.length; i++) {

            color = parameters[i][0];

            h = (360 * (color[0] + time) % 360) / 360;
            materials[i].color.setHSL(h, color[1], color[2]);
        }

        renderer.render(scene, camera);
    }

    function onDocumentMouseMove(e) {
        mouseX = e.clientX - windowHalfX;
        mouseY = e.clientY - windowHalfY;
    }

    /*	Mobile users?  I got your back homey	*/

    function onDocumentTouchStart(e) {

        if (e.touches.length === 1) {

            e.preventDefault();
            mouseX = e.touches[0].pageX - windowHalfX;
            mouseY = e.touches[0].pageY - windowHalfY;
        }
    }

    function onDocumentTouchMove(e) {

        if (e.touches.length === 1) {

            e.preventDefault();
            mouseX = e.touches[0].pageX - windowHalfX;
            mouseY = e.touches[0].pageY - windowHalfY;
        }
    }

    function onWindowResize() {

        windowHalfX = window.innerWidth / 2;
        windowHalfY = window.innerHeight / 2;

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
})();
`;

const styleGuide =
`Style Guide for Generous App
Overview
Generous is a generative AI app with a collaborative canvas, featuring a retro-inspired design with modern functionality. This updated style guide includes both light and dark modes, reflecting the Figma homepage revisions, while maintaining a clean, grid-based canvas and intuitive collaborative workspace.

Color Palette
Light Mode (Unchanged from Previous Guide):
Primary Background (Canvas): Light Gray (#E5E5E5) with a dot grid pattern (#D5D5D5).
Accent Color: Warm Orange (#FF6200) for highlights (e.g., chat messages).
Secondary Accent: Bright Green (#00FF00) for interactive elements (e.g., "Join Audio Chat").
Neutral Tones:
Off-White (#F5F5F5) for UI panels (user list, chat).
Soft Black (#1A1A1A) for text and icons.
Background (Non-Canvas): Dark Gray (#333333) for the top bar and side panels.
Dark Mode (New):
Primary Background (Canvas): Dark Gray (#2A2A2A) with a lighter dot grid pattern (#3F3F3F).
Accent Color: Warm Orange (#FF6200), retained for continuity, used for highlights (e.g., chat messages).
Secondary Accent: Bright Green (#00FF00), retained for interactive elements (e.g., "Join Audio Chat").
Neutral Tones:
Dark Off-White (#D5D5D5) for UI panels (user list, chat), ensuring readability.
Light Gray (#B0B0B0) for text and icons, replacing Soft Black for better contrast on dark backgrounds.
Background (Non-Canvas): Deep Black (#1A1A1A) for the top bar and side panels, as seen in the dark mode Figma screenshot.
Typography
Primary Font: Space Grotesk, consistent across both modes.
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com/" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap" rel="stylesheet">
Space Grotesk: CSS class for a variable style

// <weight>: Use a value from 300 to 700
// <uniquifier>: Use a unique and descriptive class name

.space-grotesk-<uniquifier> {
  font-family: "Space Grotesk", sans-serif;
  font-optical-sizing: auto;
  font-weight: <weight>;
  font-style: normal;
}
Headings: Space Grotesk Bold, 18-24pt (e.g., "SAMPLE ROOM TITLE").
Body Text: Space Grotesk Regular, 12-14pt (e.g., user list, chat messages).
Accents: Space Grotesk Italic for secondary info (e.g., timestamps).
Text Color:
Light Mode: Soft Black (#1A1A1A) for primary text, Warm Orange (#FF6200) for highlighted chat messages, Bright Green (#00FF00) for interactive text.
Dark Mode: Light Gray (#B0B0B0) for primary text, Warm Orange (#FF6200) for highlighted chat messages, Bright Green (#00FF00) for interactive text.
Imagery & Iconography
Imagery Style: Retain the retro-futuristic vibe with a watermark "Generous" logo on the canvas in both modes.
Light Mode: Translucent Off-White (#F5F5F580).
Dark Mode: Translucent Dark Off-White (#D5D5D580).
Icons: Minimal icons with a retro feel.
Light Mode: Soft Black (#1A1A1A), Bright Green (#00FF00) on hover/active.
Dark Mode: Light Gray (#B0B0B0), Bright Green (#00FF00) on hover/active.
Canvas Pattern:
Light Mode: Dot grid in #D5D5D5 on Light Gray (#E5E5E5).
Dark Mode: Dot grid in #3F3F3F on Dark Gray (#2A2A2A).
UI Elements
Top Bar:
Light Mode: Dark Gray (#333333) background, Soft Black (#1A1A1A) text, Bright Green (#00FF00) hover states.
Dark Mode: Deep Black (#1A1A1A) background, Light Gray (#B0B0B0) text, Bright Green (#00FF00) hover states.
Canvas:
Light Mode: Light Gray (#E5E5E5) with dot grid (#D5D5D5), faded "Generous" watermark.
Dark Mode: Dark Gray (#2A2A2A) with dot grid (#3F3F3F), faded "Generous" watermark.
Side Panel (User List):
Light Mode: Off-White (#F5F5F5) background, Soft Black (#1A1A1A) text, colored user dots.
Dark Mode: Dark Off-White (#D5D5D5) background, Light Gray (#B0B0B0) text, colored user dots.
Chat Section:
Light Mode: Off-White (#F5F5F5) background, Soft Black (#1A1A1A) text, Warm Orange (#FF6200) highlight.
Dark Mode: Dark Off-White (#D5D5D5) background, Light Gray (#B0B0B0) text, Warm Orange (#FF6200) highlight.
Timestamps in Space Grotesk Italic: #666666 (Light Mode), #999999 (Dark Mode).
Buttons:
Light Mode: Off-White (#F5F5F5) background, Soft Black (#1A1A1A) text/icons, Bright Green (#00FF00) active/hover.
Dark Mode: Dark Off-White (#D5D5D5) background, Light Gray (#B0B0B0) text/icons, Bright Green (#00FF00) active/hover.
Loading Indicator: Yellow dot (#FFFF00) in both modes.
Tone & Voice
Visual Tone: Clean, collaborative, and retro-inspired, with a seamless transition between light and dark modes.
Language: Casual and community-driven. Example: “Let’s create something awesome together!” Use Space Grotesk for all text.
Example Application
Home Screen (Light Mode): Dark Gray (#333333) top bar, Light Gray (#E5E5E5) canvas with dot grid, Off-White (#F5F5F5) side panels, Warm Orange (#FF6200) chat highlights.
Home Screen (Dark Mode): Deep Black (#1A1A1A) top bar, Dark Gray (#2A2A2A) canvas with dot grid, Dark Off-White (#D5D5D5) side panels, Warm Orange (#FF6200) chat highlights.
`;

const recommendedLibraries =
`Recommended Canvas Visualization Libraries for Generous

Below is a curated list of JavaScript libraries for HTML5 Canvas visualizations, tailored for Generous, a generative AI app with a collaborative, real-time canvas for simulations, games, and visualizations. These libraries are served via CDNJS, compatible with HTML and React, and optimized for mobile-first performance, real-time collaboration, and minimal dependencies to align with Generous retro-inspired, responsive design and dynamic rendering needs.

1. Konva
Purpose: A 2D canvas library for creating interactive shapes, animations, and visualizations with a scene graph.
Why for Generous: Konva is lightweight (no external dependencies), supports real-time updates for collaborative features, and offers drag-and-drop, animations, and event handling, ideal for Generous dynamic canvas where users collaboratively create simulations or games. Its scene graph simplifies managing complex visuals, and it performs well on mobile devices.
CDNJS Link (Konva 9.3.6):
<script src="https://cdnjs.cloudflare.com/ajax/libs/konva/9.3.6/konva.min.js"></script>
Integration with Generous:
Real-Time Collaboration: Use Konvas stage.toJSON() and Konva.Node.create() to serialize and sync canvas state over WebSockets (e.g., via Socket.IO) for multiplayer updates.
Mobile Performance: Enable pixelRatio adjustments for crisp rendering on high-DPI mobile screens.
Retro Aesthetic: Style shapes with Generous color palette (e.g., Vibrant Sky Blue #00A3FF, Warm Orange #FF5733) and apply Space Grotesk for text via Konvas Text nodes.
Example Usage (React for Generous):
import { useEffect, useRef } from 'react';
function CollaborativeCanvas() {
  const containerRef = useRef(null);
  useEffect(() => {
    const stage = new window.Konva.Stage({
      container: containerRef.current,
      width: 400,
      height: 400,
    });
    const layer = new window.Konva.Layer();
    const rect = new window.Konva.Rect({
      x: 50,
      y: 50,
      width: 100,
      height: 100,
      fill: '#00A3FF', // Vibrant Sky Blue from Generous palette
      draggable: true,
    });
    layer.add(rect);
    stage.add(layer);
    // Simulate real-time update (e.g., via WebSocket)
    rect.on('dragmove', () => {
      // Emit position to other users
      console.log('New position:', rect.x(), rect.y());
    });
  }, []);
  return <div ref={containerRef} style={{ background: '#F5F5F5' }} />; // Light Gray canvas background
}

Why Best Fit: Konvas simplicity, performance, and event-driven API make it ideal for Generous real-time, interactive canvas. It was previously recommended (April 13, 2025) for its balance of ease and power, and it supports Generous collaborative and mobile-first goals.

2. Fabric.js
Purpose: A canvas library for interactive graphics, supporting shapes, text, images, and animations with an object-oriented model.
Why for Generous: Fabric.js excels at creating editable, interactive visualizations (e.g., design tools or collaborative boards), supports real-time updates via canvas serialization, and is mobile-friendly. Its ability to handle text and images aligns with Generous retro aesthetic for styled visualizations.
CDNJS Link (Fabric.js 5.3.1): <script src="https://cdnjs.cloudflare.com/ajax/libs/fabric.js/5.3.1/fabric.min.js"></script>
Integration with Generous:
Real-Time Collaboration: Use canvas.toJSON() and canvas.loadFromJSON() to sync canvas state across users in real time.
Mobile Performance: Optimize by limiting object counts and using canvas.renderOnAddRemove = false for batch updates.
Retro Aesthetic: Apply Space Grotesk for text objects and use Generous colors (e.g., Bright Green #00FF85 for interactive elements).
Example Usage (React for Generous):
import { useEffect, useRef } from 'react';
function CanvasEditor() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = new window.fabric.Canvas(canvasRef.current);
    const circle = new window.fabric.Circle({
      left: 100,
      top: 100,
      radius: 50,
      fill: '#FF5733', // Warm Orange from Generous palette
      selectable: true,
    });
    canvas.add(circle);
    // Real-time sync simulation
    canvas.on('object:modified', () => {
      // Send canvas.toJSON() to server
      console.log('Canvas updated:', canvas.toJSON());
    });
  }, []);
  return <canvas ref={canvasRef} width={400} height={400} style={{ background: '#2A2A2A' }} />; // Dark Gray for dark mode
}

Why Suitable: Fabric.js is powerful for Generous collaborative editing needs, offering flexibility for simulations and visualizations with minimal setup.

3. ZIM
Purpose: A creative coding framework for canvas-based animations, games, and interactive visualizations.
Why for Generous: ZIM provides a high-level API for rapid development of interactive visuals, supports drag-and-drop and animations, and includes built-in accessibility features, aligning with Generous collaborative and inclusive goals. Its mobile-optimized rendering suits your mobile-first design.
CDNJS Link (ZIM 10.8.0):<script src="https://cdnjs.cloudflare.com/ajax/libs/zimjs/10.8.0/zim.min.js"></script>
Integration with Generous:
Real-Time Collaboration: Use ZIMs toString() and fromString() methods to serialize and share canvas states.
Mobile Performance: Leverage ZIMs Frame scaling for responsive canvas sizing on mobile devices.
Retro Aesthetic: Customize components with Generous palette and Space Grotesk for labels.
Example Usage (React for Generous):

import { useEffect } from 'react';
function InteractiveCanvas() {
  useEffect(() => {
    const frame = new window.zim.Frame('fit', 400, 400, '#F5F5F5'); // Light Gray background
    frame.on('ready', () => {
      const stage = frame.stage;
      const star = new window.zim.Star({
        points: 5,
        radius1: 50,
        radius2: 25,
        color: '#00FF85', // Bright Green from Generous palette
      }).center(stage).drag();
      stage.update();
      // Simulate collaboration
      star.on('pressmove', () => {
        // Emit position to server
        console.log('Star moved:', star.x, star.y);
      });
    });
  }, []);
  return <div id="canvas" />;
}

Why Suitable: ZIMs beginner-friendly API and built-in interactivity make it a strong choice for Generous dynamic, game-like visualizations, though its slightly heavier due to CreateJS inclusion.

Considerations for Generous
Real-Time Collaboration: All libraries support serialization (e.g., toJSON or toString) for syncing canvas states via WebSockets, critical for Generous multiplayer features. Pair with a library like Socket.IO (available on CDNJS) for networking.
Mobile-First: Konva and ZIM offer responsive scaling, while Fabric.js requires manual optimization. Test on mobile devices to ensure smooth performance.
Retro Aesthetic: Apply Generous style guide (e.g., Vibrant Sky Blue, Warm Orange, Space Grotesk) to shapes, text, and backgrounds. Use dark mode colors (e.g., Dark Gray #2A2A2A) for accessibility.
Performance: Konva is the lightest and fastest, followed by Fabric.js. ZIM is slightly heavier but offers more out-of-the-box features. Limit redraws and use debouncing for real-time updates.
React Integration: Use useEffect and useRef to manage canvas lifecycle in React components, as shown. Avoid re-rendering the canvas unnecessarily by memoizing components.`;

      // Create a prompt specifically for HTML visualization
      const htmlPrompt = `
# Canvas Generation Guide- You are controlling a canvas that is visible to all participants in a group chat. The canvas is a collaborative space that reflects the following conversation: ${messageHistory} and the requests made by participants. You are in charge of writing the code that will be rendered onto the canvas. When deciding how to create the new generation or update the canvas use the following guidelines to determine what to build:

## User Intent- Choose the appropriate framework based on the user intent expressed in the most recent message, ${lastUserMessage.content}. Include the following details: ${agentExpertPrompt} added by an AI expert to inform your canvas generation choices to clarify and add information to the user request. If the user intent in the message, ${lastUserMessage.content} is to add to, modify, change, update or otherwise make an adjustment to the existing visualization then use the current canvas found here: ${lastGenerationHtml} and alter the generation to comply with the user's request. Follow the request as closely as possible, changing only the elements the user specifies should be altered. If the user says that an element is broken or not working regenerate the visualization with a different approach for the broken element.
- Always strive to satisfy the current visualization request with as much fidelity and detail as possible. 
- Create something that directly fulfills the user request and makes users say "This is exactly what I asked for!"
- You are not a chat agent, your job is to create a new canvas or update the existing one based on the user request, you cannot interact with the user directly or clarify intents.

## Canvas Rules
- **IMPORTANT: Only render the html and do not include any comments or markdown or code blocks**
- Everything you generate will be rendered directly in the sidebar, only render the html and do not include any comments or markdown or code blocks. 
- Everything must be rendered in html in the sidebar and must be responsive.
- Keep every visualization centered in the viewport
- Use responsive design principles to create the best possible user experience
- Match the right tool/library to the request and check for dependencies
- Where possible use libraries that are more performant and have less dependencies.
- Prioritize user experience and pixel perfect design aesthetics.
- Visuals may be rendered with react components and babel for pure html/css. 
- Don't use WebGL as it does not work in the sidebar 

## Technology Selection - Use the list below as a guideline for which tools are preferred, you may substitute better js frameworks where applicable.
- Interactive tools → Use the javascript framework best fitted for the specific tool
- Data/statistics → Use D3.js or Chart.js 
- Timelines/processes → Use TimelineJS or vis.js
- 3D objects/spaces → Use babylon js
- Creative explanations → Use SVG/Canvas/p5.js or paper js for illustrations
- Math concepts → use MathJax or KaTeX for math, or custom SVG
- Games/simulations → Use Phaser or p5.js, 
- Maps/locations → Use Leaflet.js or Mapbox GL JS
- Physics simulations → Use Matter.js or another physics engine
- Simple animations → Use CSS animations or GSAP
- Scientific visualizations → Use Plotly.js or Vega-Lite
- Youtube videos → Use lite YouTube embed
- Simple text/concepts → Use elegant typography

## Your Creation Requirements:
- Ensure responsive design that works well in the sidebar panel
- Create a visualization that directly fulfills the most recent build/create/update request, ${lastUserMessage.content}
- Optimize performance (lazy load libraries, efficient code) 
- Balance aesthetics with functionality - beautiful but purposeful
- For interactive elements, use clear and intuitive controls
- Provide clear visual cues for how to interact with your creation
- Add thoughtful interactivity that improves understanding
- Make sure to INCLUDE EVENT LISTENERS for user interactions
- Include helpful annotations where appropriate
- Handle edge cases gracefully with fallbacks

## Implementation Details:
- IF YOU LOAD JAVASCRIPT OR CSS FROM A CDN, NEVER USE THE INTEGRITY ATTRIBUTE
- KEEP SCRIPTS OR LINK TAGS AS SIMPLE AS POSSIBLE, JUST LOAD THE ASSET
- RETURN FORMAT MUST BE VALID HTML WITH NO COMMENTARY OR MARKDOWN - JUST RAW HTML/CSS/JS DOCUMENT
- Use the latest stable versions of libraries
- You may use external libraries from trusted CDNs (cdnjs, unpkg, jsdelivr)
- The visualization must work immediately without setup steps
- Use appropriate semantic HTML and accessibility features
- Include fallback content if libraries fail to load
- Create smooth loading experience with transitions
- Make appropriate use of viewport dimensions
`;
      
        try {
          console.log("129o837198371398173918237189237191");
          console.log("129o837198371398173918237189237191");
          console.log("129o837198371398173918237189237191");
    

				const htmlGenerationModel = process.env.USE_XAI ? xai("grok-3-beta") : openai(process.env.DEBUG_MODEL || 'o3-mini');
         const { text: htmlContent } = await generateText({
          model: htmlGenerationModel,
          temperature: 0.9,
          prompt: htmlPrompt,
          maxTokens: 10000,
        });

				console.log("BIGTESTTTTTTTTTT", htmlContent)


        // Update the existing generation with the completed content
        const { data: updatedGeneration, error: updateError } = await supabaseService.supabase
          .from("canvas_generations")
          .update({
            html: htmlContent,
            agent_expert_response: agentExpertResponse,
            summary: `Visualization for: ${lastUserMessage.content.substring(0, 50)}${lastUserMessage.content.length > 50 ? '...' : ''}`,
            metadata: {
              status: 'completed',
              fallback: true
            },
          })
          .eq('id', emptyGeneration.id)
          .select()
          .single();

         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");
         console.log("DREAM");

         console.log({ updatedGeneration });
         console.log("Attempting to push notification about completed generation");

        // Send a notification to clients about the completed generation
        if (updatedGeneration && updatedGeneration.id) {
          await pusherService.sendNewGeneration(
            roomId,
            updatedGeneration.id,
            "generation-completed",
            updatedGeneration.created_at || new Date().toISOString(),
            slug
          );

          logger.info(
            "Notification sent to clients about completed generation:",
            updatedGeneration.id
          );
        } else {
          logger.warn("Cannot send notification: updated generation ID is undefined");
        }
        return true;
      } catch (e) {
        logger.error("Error calling canvas visualization function:", e);
      }
    } // Close the if (shouldGenerateHtml) block

    return true;
  } catch (error) {
    logger.error("Error in generateResponseWithAgent:", error instanceof Error ? error.message : String(error));
    return false;
  }
}

export default generateResponseWithAgent;