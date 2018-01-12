/**
 * @author Adam Alsegård / http://www.adamalsegard.se
 */

// Make sure that we cannot use undeclared variables etc.
('use strict');

/**
 * GET STUFF
 */
var isWebglEnabled = require('detector-webgl');
var THREE = require('three');
var glslify = require('glslify');

var datGUI = require('./static/js/dat.gui.min.js');
var OrbitControls = require('three-orbit-controls')(THREE);

// Check if browser supports WebGL before rendering anything.
if (!isWebglEnabled) {
  alert('WebGL is not supported on this browser! \n Please try another!');
}

/**
 * DECLARE VARIABLES
 */
var camera,
  orbitControl,
  scene,
  renderer,
  sky,
  sunSphere,
  angleIncrease = 0.0005,
  horizontalAngleInc = 0.001,
  sunDist = 450000;

// Starting settings in GUI.
var settingsMenu = {
  turbidity: 10, // Drinking water should have ~5, In the air it can be [0.3 - 150]
  rayleighScatter: 2, // Rayleigh Scatter Coefficient
  luminance: 1,
  mieCoefficient: 0.005,
  // According to GPU-gems the Mie scattering direction should be between -0.77 and -0.999
  // (I've probably flipped the sign somewhere, or they misspelled theirs.)
  mieScatteringDir: 0.758,
  manualControl: true,
  verticalAngle: 0.0, // Inclination/elevation of the sun
  horizontalAngle: Math.PI * 0.5, // Azimuthal angle
  sun: !true,
  angleStep: angleIncrease,
  sunExposure: 1000.0, // Intensity of the sun
};

// Set up listeners.
document.addEventListener('DOMContentLoaded', onDocumentLoaded, false);
window.addEventListener('resize', onWindowResize, false);
window.addEventListener('error', onError);

/**
 * INIT FUNCTIONS
 */
function initAtmosphere() {
  // Create a shader program for the sky!
  var skyMat = new THREE.ShaderMaterial({
    vertexShader: glslify('./shaders/sky.vert'),
    fragmentShader: glslify('./shaders/sky.frag'),
    uniforms: {
      luminance: { value: settingsMenu.luminance },
      turbidity: { value: settingsMenu.turbidity },
      rayleighScatter: { value: settingsMenu.rayleighScatter },
      mieCoefficient: { value: settingsMenu.mieCoefficient },
      mieScatteringDir: { value: settingsMenu.mieScatteringDir },
      sunPos: { value: new THREE.Vector3() },
      sunExposure: {value: settingsMenu.sunExposure },
      cameraPos: { value: camera.position },
      sunDistance: { sunDist },
    },
    side: THREE.BackSide
  });

  // Create a buffer geometry we can attach the atmosphere to and add to scene.
  var skyGeo = new THREE.SphereBufferGeometry(1, 32, 32);
  sky = new THREE.Mesh(skyGeo, skyMat);
  sky.scale.setScalar(sunDist);
  scene.add(sky);

  // Add a sphere as a "Sun Helper" and hide it initially.
  sunSphere = new THREE.Mesh(
    new THREE.SphereBufferGeometry(4000, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  sunSphere.visible = false;
  scene.add(sunSphere);
}

// Callback function for settings changes.
// (Should really be at the bottom with the callback functions but wth!)
function guiChanged() {
  var uniforms = sky.material.uniforms;
  uniforms.turbidity.value = settingsMenu.turbidity;
  uniforms.rayleighScatter.value = settingsMenu.rayleighScatter;
  uniforms.luminance.value = settingsMenu.luminance;
  uniforms.mieCoefficient.value = settingsMenu.mieCoefficient;
  uniforms.mieScatteringDir.value = settingsMenu.mieScatteringDir;
  uniforms.sunExposure.value = settingsMenu.sunExposure;

  // If user has chosen manual control we set the sun's position according to user settings,
  // otherwise we increase the angle automatically.
  if (settingsMenu.manualControl) {
    var theta = settingsMenu.verticalAngle; // [-pi, pi]
    var phi = settingsMenu.horizontalAngle; // [-pi/2, pi/2]

    sunSphere.position.x = sunDist * Math.cos(phi);
    sunSphere.position.y = sunDist * Math.sin(phi) * Math.sin(theta);
    sunSphere.position.z = sunDist * Math.sin(phi) * Math.cos(theta);
    uniforms.sunPos.value.copy(sunSphere.position);

    // Make sure it doesn't increase without us telling it to!
    angleIncrease = 0;
  } else {
    angleIncrease = settingsMenu.angleStep;
  }

  sunSphere.visible = settingsMenu.sun;

  renderer.render(scene, camera);
}

// Create GUI for the settings menu.
function initGUI() {
  var gui = new datGUI.GUI({
    autoPlace: false,
    width: 300,
    name: 'Settings'
  });

  // Collect setting for scattering in a folder.
  gui.addFolder('Scattering params');
  gui.add(settingsMenu, 'turbidity', 0.1, 150.0, 0.1).onChange(guiChanged);
  gui.add(settingsMenu, 'rayleighScatter', 0.0, 6.0, 0.001).onChange(guiChanged);
  gui.add(settingsMenu, 'mieCoefficient', 0.0, 1.0, 0.001).onChange(guiChanged);
  gui
    .add(settingsMenu, 'mieScatteringDir', -0.99, 0.99, 0.001)
    .onChange(guiChanged);
  gui.add(settingsMenu, 'luminance', 0.1, 1.2, 0.01).onChange(guiChanged);
  gui.add(settingsMenu, 'sunExposure', 0, 5000).onChange(guiChanged);

  // Folder for time and placement of the sun.
  gui.addFolder('Time & Sun placement');
  gui.add(settingsMenu, 'manualControl').onChange(guiChanged);
  gui
    .add(settingsMenu, 'verticalAngle', -Math.PI, Math.PI, 0.0001)
    .onChange(guiChanged)
    .listen(); // Listen to automatic changes to user can see them in the GUI.
  gui
    .add(settingsMenu, 'horizontalAngle', -0.5 * Math.PI, 0.5 * Math.PI, 0.0001)
    .onChange(guiChanged)
    .listen(); // Listen here as well, even if it hardly ever moves...
  gui.add(settingsMenu, 'angleStep', -0.01, 0.01, 0.00001).onChange(guiChanged);
  gui.add(settingsMenu, 'sun').onChange(guiChanged);

  // Folder for procedural landscape.
  gui.addFolder('Landscape & cloud generation');

  // Placement of the GUI.
  document.body.appendChild(gui.domElement);
  gui.domElement.style.position = 'fixed';
  gui.domElement.style.left = '2em';
  gui.domElement.style.top = '2em';

  guiChanged();
}

/**
 * MAIN (RENDER) LOOP
 */
function renderLoop() {
  // Increase sun angle by time (if chosen in settings).
  settingsMenu.verticalAngle += angleIncrease;
  settingsMenu.horizontalAngle -= horizontalAngleInc * angleIncrease;
  sunSphere.position.x = sunDist * Math.cos(settingsMenu.horizontalAngle);
  sunSphere.position.y =
    sunDist *
    Math.sin(settingsMenu.horizontalAngle) *
    Math.sin(settingsMenu.verticalAngle);
  sunSphere.position.z =
    sunDist *
    Math.sin(settingsMenu.horizontalAngle) *
    Math.cos(settingsMenu.verticalAngle);
  
  // Send new value to the sky fragment shader.
  sky.material.uniforms.sunPos.value.copy(sunSphere.position);

  // Render scene and call render loop again.
  renderer.render(scene, camera);
  requestAnimationFrame(renderLoop);
}

/**
 * MAIN (LOAD) FUNCTION
 */
function onDocumentLoaded() {
  // Set up the Scene
  scene = new THREE.Scene();
  var grid = new THREE.GridHelper(10000, 2, 0xffffff, 0xffffff);
  scene.add(grid);

  // Set up the Camera
  camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    10,
    2000000
  );
  camera.position.set(0, 10, -100); // Looks towards origo -> make sure we see the sun at first.

  // Set up the Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Enable shadows. (TODO: this is not implemented yet!)
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Set up navigation Controls
  orbitControl = new OrbitControls(camera, renderer.domElement);
  // NOTE: OrbitControl has a problem with its 'mouseup' event (it need to be added at scope level, not document)
  // I fixed this on a local level in three-orbit-controls/index.js but if anybody downloads this the
  // same problem will arise again and you need to fix it yourself!
  orbitControl.addEventListener('change', () => {
    // Send camera position to sky fragment shader.
    sky.material.uniforms.cameraPos.value.copy(camera.position);
  });

  // Init all shaders!
  initAtmosphere();
  // TODO: initLandscape();
  // TODO: initClouds();

  // Init settings menu
  initGUI();

  // Start render
  requestAnimationFrame(renderLoop);
}

/**
 * CALLBACK FUNCTIONS
 */

// Window resize callback.
function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
}

// Error handling.
function onError(e, url, line) {
  alert('Renderer encountered an error: \n' + e.message);
}
