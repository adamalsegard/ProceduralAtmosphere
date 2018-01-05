/**
 * @author Adam Alsegård / http://www.adamalsegard.se
 */

// Check if browser supports WebGL before rendering anything.
if (!Detector.webgl) {
  var warning = Detector.getWebGLErrorMessage();
  document.body.appendChild(warning);
}

('use strict');


var THREE = require('three')