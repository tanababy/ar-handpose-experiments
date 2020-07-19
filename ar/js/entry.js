//utility
const getRandom = (min, max) => {
  return Math.floor(Math.random() * (max + 1 - min)) + min;
};

//Tensorflow.js (handpose)
let model;
let point = { x: 0, y: 0 };
async function aiModelLoad() {
  model = await handpose.load();
}
async function runDetect($video) {
  const predictions = await model.estimateHands($video); //webcamを渡す
  const videoWidth = $video.offsetWidth;
  const videoHeight = $video.offsetHeight;

  if (predictions.length > 0) {
    const keypoints = predictions[0].annotations.indexFinger;
    const [x, y, z] = keypoints[3];
    point.x = ((videoWidth - x) / videoWidth) * 4.0 * -1.0 + 3.0;
    point.y = (y / videoHeight) * 4.0 - 1.0;

    console.log(point);

    // console.log(`Keypoint [${x}, ${y}, ${z}]`); //人差し指の一番先の部分の3d座標が表示
  }
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

  setTimeout(async () => {
    await aiModelLoad(); //機械学習モデルのロードを待って
    predict(); //計算開始
    // predictLoop(500);
    // document
    //   .getElementById('arjs-video')
    //   .addEventListener('loadeddata', () => {});
  }, 1000);

  // async function predictLoop(msec) {
  //   predict();
  //   setTimeout(() => {
  //     predictLoop(msec);
  //   }, msec);
  // }

  function predict() {
    runDetect(document.getElementById('arjs-video'));
    window.requestAnimationFrame(predict);
  }

  axesHelper = new THREE.AxesHelper(10);
  scene.add(axesHelper);

  const geometry = new THREE.BoxGeometry();
  const meshArr = [];

  const Fgeometry = new THREE.CubeGeometry(0.3, 0.3, 0.3);
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

    Fmesh.position.set(point.x * 10.0, 0.0, point.y * 10.0);
  };

  loop();
};

startAR();
