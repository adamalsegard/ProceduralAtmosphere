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
var FlyControls = require('three-fly-controls')(THREE);
var OrbitControls = require('three-orbit-controls')(THREE);

// Check if browser supports WebGL before rendering anything.
if (!isWebglEnabled) {
  alert('WebGL is not supported on this browser! \n Please try another!');
}

/**
 * DECLARE VARIABLES
 */
var camera, flyControl, orbitControl, scene, renderer, sky, sunSphere, theta;

// Set up listeners
document.addEventListener('DOMContentLoaded', onDocumentLoaded, false);
window.addEventListener('resize', onWindowResize, false);
window.addEventListener('error', onError);

/**
 * INIT FUNCTION
 */
function initAtmosphere() {
  // Add Sky
  var skyMat = new THREE.ShaderMaterial({
    vertexShader: glslify('./shaders/sky.vert'),
    fragmentShader: glslify('./shaders/sky.frag'),
    uniforms: {
      luminance: { value: 1 },
      turbidity: { value: 2 },
      rayleigh: { value: 1 },
      mieCoefficient: { value: 0.005 },
      mieDirectionalG: { value: 0.8 },
      sunPosition: { value: new THREE.Vector3() }
    },
    side: THREE.BackSide
  });
  var skyGeo = new THREE.SphereBufferGeometry(1, 32, 32);
  sky = new THREE.Mesh(skyGeo, skyMat);
  sky.scale.setScalar(450000);
  scene.add(sky);

  // Add Sun Helper
  sunSphere = new THREE.Mesh(
    new THREE.SphereBufferGeometry(20000, 16, 8),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  );
  sunSphere.position.y = -700000;
  sunSphere.visible = false;
  scene.add(sunSphere);
}

// Create GUI for settingsMenu
function initGUI() {
  
  // Starting settings in GUI
  var settingsMenu = {
    turbidity: 10,
    rayleigh: 2,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.8,
    luminance: 1,
    inclination: 0.49, // elevation / inclination
    azimuth: 0.25, // Facing front,
    sun: !true
  };

  var distance = 400000;

  // Callback function for settingsMenu changes
  function guiChanged() {
    var uniforms = sky.material.uniforms;
    uniforms.turbidity.value = settingsMenu.turbidity;
    uniforms.rayleigh.value = settingsMenu.rayleigh;
    uniforms.luminance.value = settingsMenu.luminance;
    uniforms.mieCoefficient.value = settingsMenu.mieCoefficient;
    uniforms.mieDirectionalG.value = settingsMenu.mieDirectionalG;

    var theta = Math.PI * (settingsMenu.inclination - 0.5); // [-pi/2, pi/2]
    var phi = 2 * Math.PI * (settingsMenu.azimuth - 0.5); // [-pi, pi]

    sunSphere.position.x = distance * Math.cos(phi);
    sunSphere.position.y = distance * Math.sin(phi) * Math.sin(theta);
    sunSphere.position.z = distance * Math.sin(phi) * Math.cos(theta);

    sunSphere.visible = settingsMenu.sun;

    uniforms.sunPosition.value.copy(sunSphere.position);

    renderer.render(scene, camera);
  }

  var gui = new datGUI.GUI({
    autoPlace: false,
    width: 400,
    name: 'Settings'
  });

  gui.add(settingsMenu, 'turbidity', 1.0, 20.0, 0.1).onChange(guiChanged);
  gui.add(settingsMenu, 'rayleigh', 0.0, 4, 0.001).onChange(guiChanged);
  gui
    .add(settingsMenu, 'mieCoefficient', 0.0, 0.1, 0.001)
    .onChange(guiChanged);
  gui
    .add(settingsMenu, 'mieDirectionalG', 0.0, 1, 0.001)
    .onChange(guiChanged);
  gui.add(settingsMenu, 'luminance', 0.0, 2).onChange(guiChanged);
  gui.add(settingsMenu, 'inclination', 0, 1, 0.0001).onChange(guiChanged);
  gui.add(settingsMenu, 'azimuth', 0, 1, 0.0001).onChange(guiChanged);
  gui.add(settingsMenu, 'sun').onChange(guiChanged);

  document.body.appendChild(gui.domElement);
    gui.domElement.style.position = "fixed";
    gui.domElement.style.left = "2em";
    gui.domElement.style.top = "5em";

  guiChanged();
}

/**
 * MAIN (RENDER) LOOP
 */
function renderLoop() {
  // Increase sun angle by time
  var uniforms = sky.material.uniforms;
  theta += 0.0125;
  //sunSphere.position.add()
  //uniforms.sunPosition.value.copy(sunSphere.position);

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
  camera.position.set(0, 100, 2000);

  // Set up the Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Enable shadows.
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Set up navigation Controls
  orbitControl = new OrbitControls(camera, renderer.domElement);
  // NOTE: OrbitControl has a problem with its 'mouseup' event (it need to be added at scope level, not document)
  // I fixed this on a local level in three-orbit-controls/index.js but if one downloads this the
  // same problem will rise again!
  // Also: The FlyControl doesn't work...
  //flyControl = new THREE.FlyControls(camera, renderer.domElement);

  // Starting angle for the sun
  theta = 0;

  // Init all shaders!
  initAtmosphere();

  // Init settingsMenu
  initGUI();

  // Start render
  requestAnimationFrame(renderLoop);
}

/**
 * CALLBACK FUNCTIONS
 */

// Window resize callback
function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
}

// Error handling
function onError(e, url, line) {
  alert('Renderer encountered an error: \n' + e.message);
}
