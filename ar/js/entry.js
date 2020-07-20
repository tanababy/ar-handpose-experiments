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
  const count = 150;

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
  });
  renderer.setClearColor(new THREE.Color(), 0);
  renderer.setSize(640, 580);
  renderer.domElement.style.position = 'absolute';
  renderer.domElement.style.top = '0px';
  renderer.domElement.style.left = '0px';
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.visible = false;
  const camera = new THREE.PerspectiveCamera(
    60,
    document.body.offsetWidth / document.body.offset,
    1,
    10
  );
  scene.add(camera);

  const arToolkitSource = new THREEx.ArToolkitSource({
    sourceType: 'webcam',
  });

  const onResize = () => {
    arToolkitSource.onResizeElement();
    arToolkitSource.copyElementSizeTo(renderer.domElement);
    if (arToolkitContext.arController !== null) {
      arToolkitSource.copyElementSizeTo(arToolkitContext.arController.canvas);
    }
  };

  window.addEventListener('resize', () => {
    onResize();
  });

  arToolkitSource.init(() => {
    setTimeout(() => {
      onResize();
    }, 2000);
  });

  const arToolkitContext = new THREEx.ArToolkitContext({
    cameraParametersUrl: './camera_para.dat',
    detectionMode: 'mono',
  });

  arToolkitContext.init(() => {
    camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
  });

  const arMarkerControls = new THREEx.ArMarkerControls(
    arToolkitContext,
    camera,
    {
      type: 'pattern',
      patternUrl: './patt.hiro',
      changeMatrixMode: 'cameraTransformMatrix',
    }
  );

  axesHelper = new THREE.AxesHelper(1);
  scene.add(axesHelper);

  const geometry = new THREE.BoxGeometry();
  const meshArr = [];

  const Fgeometry = new THREE.CubeGeometry(1, 1, 1);
  const Fmaterial = new THREE.MeshNormalMaterial();
  const Fmesh = new THREE.Mesh(Fgeometry, Fmaterial);
  scene.add(Fmesh);

  for (let i = 0; i < count; i++) {
    const hue = 360 * Math.random();
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(`hsl(${hue},100%,50%)`),
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(
      getRandom(-10, 10),
      getRandom(-10, 10),
      getRandom(-10, 10)
    );
    mesh.scale.set(0.3, 0.3, 0.3);
    // scene.add(mesh);
    meshArr.push(mesh);
  }

  //Text

  const clock = new THREE.Clock();

  const loop = () => {
    window.requestAnimationFrame(loop);
    if (arToolkitSource.ready) {
      arToolkitContext.update(arToolkitSource.domElement);
      scene.visible = camera.visible;
    }
    const delta = clock.getDelta();
    meshArr.map((instance) => {
      instance.rotation.x += delta * 1.0;
      instance.rotation.y += delta * 1.5;
    });
    renderer.render(scene, camera);

    Fmesh.position.set(point.x, 0.0, point.y);
  };

  loop();
};

startAR();
setTimeout(start, 2000);
