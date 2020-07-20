//utility
const getRandom = (min, max) => {
  return Math.floor(Math.random() * (max + 1 - min)) + min;
};

//Tensorflow.js (handpose)
let point = { x: 0, y: 0 };
function startVideo(video) {
  return new Promise((resolve, reject) => {
    navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          facingMode: 'environment',
        },
      })
      .then((stream) => {
        resolve(true);
        video.addEventListener('loadedmetadata', () => {
          resolve(true);
        });
      })
      .catch((err) => {
        resolve(false);
      });
  });
}
async function start() {
  const model = await handpose.load();
  const video = document.getElementById('arjs-video');
  const status = await startVideo(video);
  if (status) {
    runDetect(model, video);
  }
}
async function runDetect(model, video) {
  const predictions = await model.estimateHands(video); //webcamを渡す
  const videoWidth = video.offsetWidth;
  const videoHeight = video.offsetHeight;

  if (predictions.length > 0) {
    const keypoints = predictions[0].annotations.indexFinger;
    const [x, y, z] = keypoints[3];
    point.x = ((videoWidth - x) / videoWidth) * 4.0 * -1.0 + 3.0;
    point.y = (y / videoHeight) * 4.0 - 1.0;

    console.log(point);
  }

  setTimeout(() => {
    runDetect(model, video);
  }, 500);
}

//AR.js
const startAR = () => {
  //////////////////////////////////////////////////////////////////////////////////
  //		Init
  //////////////////////////////////////////////////////////////////////////////////

  // init renderer
  var renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setClearColor(new THREE.Color('lightgrey'), 0);
  // renderer.setPixelRatio( 1/2 );
  renderer.setSize(640, 480);
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0px';
  renderer.domElement.style.left = '0px';
  document.body.appendChild(renderer.domElement);

  // array of functions for the rendering loop
  var onRenderFcts = [];

  // init scene and camera
  var scene = new THREE.Scene();

  //////////////////////////////////////////////////////////////////////////////////
  //		Initialize a basic camera
  //////////////////////////////////////////////////////////////////////////////////
  // Create a camera
  var camera = new THREE.Camera();
  scene.add(camera);

  ////////////////////////////////////////////////////////////////////////////////
  //          handle arToolkitSource
  ////////////////////////////////////////////////////////////////////////////////
  var arToolkitSource = new THREEx.ArToolkitSource({
    // to read from the webcam
    sourceType: 'webcam',
  });

  arToolkitSource.init(function onReady() {
    setTimeout(() => {
      onResize();
    }, 2000);
  });

  // handle resize
  window.addEventListener('resize', function () {
    onResize();
  });
  function onResize() {
    arToolkitSource.onResizeElement();
    arToolkitSource.copyElementSizeTo(renderer.domElement);
    if (arToolkitContext.arController !== null) {
      arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  //          initialize arToolkitContext
  ////////////////////////////////////////////////////////////////////////////////

  // create atToolkitContext
  var arToolkitContext = new THREEx.ArToolkitContext({
    cameraParametersUrl: './camera_para.dat',
    detectionMode: 'mono',
    maxDetectionRate: 30,
    canvasWidth: 80 * 3,
    canvasHeight: 60 * 3,
  });
  // initialize it
  arToolkitContext.init(function onCompleted() {
    // copy projection matrix to camera
    camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
  });

  // update artoolkit on every frame
  onRenderFcts.push(function () {
    if (arToolkitSource.ready === false) return;

    arToolkitContext.update(arToolkitSource.domElement);
  });

  ////////////////////////////////////////////////////////////////////////////////
  //          Create a ArMarkerControls
  ////////////////////////////////////////////////////////////////////////////////
  var markerRoot = new THREE.Group();
  scene.add(markerRoot);

  var artoolkitMarker = new THREEx.ArMarkerControls(
    arToolkitContext,
    markerRoot,
    {
      type: 'pattern',
      patternUrl: './patt.hiro',
    }
  );
  // build a smoothedControls
  var smoothedRoot = new THREE.Group();
  scene.add(smoothedRoot);
  var smoothedControls = new THREEx.ArSmoothedControls(smoothedRoot, {
    lerpPosition: 0.4,
    lerpQuaternion: 0.3,
    lerpScale: 1,
  });
  onRenderFcts.push(function (delta) {
    smoothedControls.update(markerRoot);
  });

  //////////////////////////////////////////////////////////////////////////////////
  //		add an object in the scene
  //////////////////////////////////////////////////////////////////////////////////

  var arWorldRoot = smoothedRoot;

  // add a torus knot
  var geometry = new THREE.BoxGeometry(1, 1, 1);
  var material = new THREE.MeshNormalMaterial({
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = geometry.parameters.height / 2;
  arWorldRoot.add(mesh);

  var axesHelper = new THREE.AxesHelper(5);
  arWorldRoot.add(axesHelper);

  var geometry = new THREE.TorusKnotGeometry(0.3, 0.1, 64, 16);
  var material = new THREE.MeshNormalMaterial();
  var mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = 0.5;
  arWorldRoot.add(mesh);

  onRenderFcts.push(function () {
    mesh.rotation.x += 0.1;
  });

  //////////////////////////////////////////////////////////////////////////////////
  //		render the whole thing on the page
  //////////////////////////////////////////////////////////////////////////////////
  // var stats = new Stats();
  // document.body.appendChild(stats.dom);
  // render the scene
  onRenderFcts.push(function () {
    renderer.render(scene, camera);
    // stats.update();
  });

  // run the rendering loop
  var lastTimeMsec = null;
  requestAnimationFrame(function animate(nowMsec) {
    // keep looping
    requestAnimationFrame(animate);
    // measure time
    lastTimeMsec = lastTimeMsec || nowMsec - 1000 / 60;
    var deltaMsec = Math.min(200, nowMsec - lastTimeMsec);
    lastTimeMsec = nowMsec;
    // call each update function]
    onRenderFcts.forEach(function (onRenderFct) {
      onRenderFct(deltaMsec / 1000, nowMsec / 1000);
    });
  });
};

startAR();
// setTimeout(start, 2000);
