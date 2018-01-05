/**
 * webgl_shaders_sky example three.js
 */

// Check if browser supports WebGL before rendering anything.
if (!Detector.webgl) {
  var warning = Detector.getWebGLErrorMessage();
  document.body.appendChild(warning);
}

('use strict');

var container;
var camera, controls, scene, renderer;
var sky, sunSphere;

/**
 * Init function
 */
function initSky() {
  // Add Sky
  sky = new THREE.Sky();
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

  /// GUI

  var effectController = {
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

  function guiChanged() {
    var uniforms = sky.material.uniforms;
    uniforms.turbidity.value = effectController.turbidity;
    uniforms.rayleigh.value = effectController.rayleigh;
    uniforms.luminance.value = effectController.luminance;
    uniforms.mieCoefficient.value = effectController.mieCoefficient;
    uniforms.mieDirectionalG.value = effectController.mieDirectionalG;

    var theta = Math.PI * (effectController.inclination - 0.5);
    var phi = 2 * Math.PI * (effectController.azimuth - 0.5);

    sunSphere.position.x = distance * Math.cos(phi);
    sunSphere.position.y = distance * Math.sin(phi) * Math.sin(theta);
    sunSphere.position.z = distance * Math.sin(phi) * Math.cos(theta);

    sunSphere.visible = effectController.sun;

    uniforms.sunPosition.value.copy(sunSphere.position);

    renderer.render(scene, camera);
  }

  var gui = new dat.GUI();

  gui.add(effectController, 'turbidity', 1.0, 20.0, 0.1).onChange(guiChanged);
  gui.add(effectController, 'rayleigh', 0.0, 4, 0.001).onChange(guiChanged);
  gui
    .add(effectController, 'mieCoefficient', 0.0, 0.1, 0.001)
    .onChange(guiChanged);
  gui
    .add(effectController, 'mieDirectionalG', 0.0, 1, 0.001)
    .onChange(guiChanged);
  gui.add(effectController, 'luminance', 0.0, 2).onChange(guiChanged);
  gui.add(effectController, 'inclination', 0, 1, 0.0001).onChange(guiChanged);
  gui.add(effectController, 'azimuth', 0, 1, 0.0001).onChange(guiChanged);
  gui.add(effectController, 'sun').onChange(guiChanged);

  guiChanged();
}

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
}

/**
 * MAIN LOOP
 */
function mainLoop() {
  // TODO!!
  // Increase sun angle by time or something!?
  renderer.render(scene, camera);
}

/**
 * MAIN (LOAD) FUNCTION
 */
//$(document).ready(function() {
  // Set up the Scene
  scene = new THREE.Scene();
  var helper = new THREE.GridHelper(10000, 2, 0xffffff, 0xffffff);
  scene.add(helper);

  // Set up the Camera
  camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    100,
    2000000
  );
  camera.position.set(0, 100, 2000);
  //camera.setLens(20);

  // Set up the Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  // Enable shadows.
  //renderer.shadowMap.enabled = true;
  //renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.body.appendChild(renderer.domElement);

  // Set up navigation Controls
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  //controls = new THREE.FlyControls( camera, renderer.domElement );
  controls.addEventListener('change', () => {
    renderer.render(scene, camera);
  });

  // Add resize listener
  window.addEventListener('resize', onWindowResize, false);

  // Init sky shader! // TODO: This needs to change!
  initSky();

  // Start render!
  renderer.render(scene, camera);

  // TODO: Use this instead
  //requestAnimationFrame(mainLoop);
//});
