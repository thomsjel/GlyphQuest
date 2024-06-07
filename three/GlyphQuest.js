import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Text } from "troika-three-text";
import {
  COLOR,
  TEXTS,
  MATERIALS,
  POSITIONS,
} from "./constants/glyphQuest/index.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";

export default class GlyphQuest {
  constructor(options) {
    this.ueq = options.ueq;

    // Loadings ...
    const loadingManager = new THREE.LoadingManager(
      () => {
        console.log("Loading complete!");
      },
      (item, loaded, total) => {
        console.log("Loading: " + (loaded / total) * 100 + "%");
      }
    );
    this.gltfLoader = new GLTFLoader(loadingManager);

    this.shadowMapResolution = 2048;
    this.shadowBlur = 10;

    this.start();
  }

  async start() {
    if ("xr" in navigator) {
      const supported = await navigator.xr.isSessionSupported("immersive-ar");
      if (supported) {
        this.startExperience();
      }
    } else {
      alert("WebXR not available in this browser");
    }
  }

  async startExperience() {
    let hitTestSource = null;
    let hitTestSourceRequested = false;
    let groundHeight = 0;
    let groundHeightSet = false;

    const domOverlay = document.getElementById("dom-overlay-root");
    const intro = document.getElementById("intro");

    const container = document.createElement("div");
    container.id = "custom-canvas";
    document.body.appendChild(container);

    const scene = new THREE.Scene();

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Set up the WebGLRenderer, which handles rendering to the session's base layer.
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.needsUpdate = true;

    const camera = new THREE.PerspectiveCamera();
    camera.matrixAutoUpdate = false;

    container.appendChild(renderer.domElement);

    const arButton = ARButton.createButton(renderer, {
      requiredFeatures: ["local", "hit-test", "dom-overlay"],
      domOverlay: { root: domOverlay },
    });
    document.body.appendChild(arButton);

    // Remove intro screen
    arButton.addEventListener("click", () => {
      intro.style.display = "none";
    });

    // Add scene lighting
    const directionalLight = new THREE.DirectionalLight(0xffffff, 8);
    directionalLight.position.set(-4, 2, -2);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = this.shadowMapResolution;
    directionalLight.shadow.mapSize.height = this.shadowMapResolution;
    directionalLight.shadow.camera.near = 0.01;
    directionalLight.shadow.camera.far = 20;
    directionalLight.shadow.camera.left = -10; // Adjust to cover your scene
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 4;
    directionalLight.shadow.camera.bottom = -4;
    directionalLight.shadow.radius = this.shadowBlur;
    scene.add(directionalLight);

    const reticleGeometry = new THREE.RingGeometry(0.1, 0.11, 32);
    const reticle = new THREE.Mesh(reticleGeometry, MATERIALS.RETICLE);
    reticle.rotation.x = -Math.PI / 2;
    reticle.visible = false;
    scene.add(reticle);

    const shadowStationCGeometry = new THREE.PlaneGeometry(5, 5);
    const shadowStationCMaterial = new THREE.ShadowMaterial({
      opacity: 0.3,
    });
    const shadowStationC = new THREE.Mesh(
      shadowStationCGeometry,
      shadowStationCMaterial
    );
    shadowStationC.rotation.x = -Math.PI / 2;
    shadowStationC.receiveShadow = true;
    shadowStationC.material.needsUpdate = true;
    shadowStationC.position.set(
      POSITIONS.STATION_C.x,
      0,
      POSITIONS.STATION_C.z
    );
    scene.add(shadowStationC);

    const shadowStationDGeometry = new THREE.PlaneGeometry(5, 5);
    const shadowStationDMaterial = new THREE.ShadowMaterial({
      opacity: 0.3,
    });
    const shadowStationD = new THREE.Mesh(
      shadowStationDGeometry,
      shadowStationDMaterial
    );
    shadowStationD.rotation.x = -Math.PI / 2;
    shadowStationD.receiveShadow = true;
    shadowStationD.material.needsUpdate = true;
    shadowStationD.position.set(
      POSITIONS.STATION_D.x,
      0,
      POSITIONS.STATION_D.z
    );
    scene.add(shadowStationD);

    //Create testing stations
    const stationA = this.createStationA();
    stationA.name = "Station A";
    scene.add(stationA);

    const stationB = this.createStationB();
    stationB.name = "Station B";
    scene.add(stationB);

    const stationC = await this.createStationC();
    stationC.name = "Station C";
    scene.add(stationC);

    const stationD = await this.createStationD();
    stationD.name = "Station D";
    scene.add(stationD);

    const stationE = await this.loadStationE();
    stationE.name = "Station E";
    scene.add(stationE);

    const stationARadius = this.createBoundary(stationA, scene);
    const stationBRadius = this.createBoundary(stationB, scene);
    const stationCRadius = this.createBoundary(stationC, scene);
    const stationDRadius = this.createBoundary(stationD, scene);
    const stationERadius = this.createBoundary(stationE, scene);

    const animate = () => {
      renderer.setAnimationLoop(render);
    };

    const render = (timestamp, frame) => {
      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (hitTestSourceRequested === false) {
          session
            .requestReferenceSpace("viewer")
            .then(function (referenceSpace) {
              session
                .requestHitTestSource({ space: referenceSpace })
                .then(function (source) {
                  hitTestSource = source;
                });
            });

          hitTestSourceRequested = true;
        }

        if (hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);

          if (hitTestResults.length > 0) {
            const hit = hitTestResults[0];
            const hitPose = hitTestResults[0].getPose(referenceSpace);

            reticle.visible = true;
            reticle.matrix.fromArray(
              hit.getPose(referenceSpace).transform.matrix
            );

            let position = new THREE.Vector3();
            let quaternion = new THREE.Quaternion();
            let scale = new THREE.Vector3();

            // Decompose the matrix to get the quaternion
            reticle.matrix.decompose(position, quaternion, scale);

            if (!groundHeightSet) {
              groundHeight = position.y;
              groundHeightSet = true;
            }

            if (position.y <= groundHeight + 0.001) {
              this.setToFloorPosition(stationARadius, hitPose, true);
              this.setToFloorPosition(stationBRadius, hitPose, true);
              this.setToFloorPosition(stationCRadius, hitPose, true);
              this.setToFloorPosition(stationDRadius, hitPose, true);
              this.setToFloorPosition(stationERadius, hitPose, true);
              this.setToFloorPosition(stationC, hitPose);
              this.setToFloorPosition(stationD, hitPose);
              this.setToFloorPosition(shadowStationC, hitPose);
              this.setToFloorPosition(shadowStationD, hitPose);
            }

            reticle.position.set(position.x, position.y, position.z);
          } else {
            reticle.visible = false;
          }
        }

        // Check boundaries for all stations
        let closestStation = null;
        let minDistance = Infinity;
        const stations = [{ station: stationC, radius: stationCRadius }];

        for (const { station, radius } of stations) {
          const distance = this.boundaryCheck(station, radius, camera);
          if (distance <= 2 && distance < minDistance) {
            closestStation = station;
            minDistance = distance;
          }
        }

        if (closestStation) {
          this.ueq.setAttribute("title", closestStation.name);
          this.ueq.style.display = "flex";
        } else {
          this.ueq.setAttribute("title", "undefined");
          this.ueq.style.display = "none";
        }

        // Enable billboarding
        if (stationA) {
          stationA.lookAt(camera.getWorldPosition(new THREE.Vector3()));
        }

        renderer.render(scene, camera);
      }
    };
    animate();
  }

  async xrWithNoWorkingShadows() {
    let floorShadowEnabled = false;
    let groundHeight = 0;
    let groundHeightSet = false;

    const domOverlay = document.getElementById("dom-overlay-root");
    this.ueq = document.querySelector(".questionnaire-root");
    // Add a canvas element and initialize a WebGL context that is compatible with WebXR.
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const gl = canvas.getContext("webgl", { xrCompatible: true });

    const scene = new THREE.Scene();

    this.stationCModel;
    this.stationEModel;
    this.shadowPlane = null;
    let reticle = this.createReticle();

    scene.add(reticle);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Set up the WebGLRenderer, which handles rendering to the session's base layer.
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      //antialias: true,
      canvas: canvas,
    });
    renderer.xr.enabled = true;
    //renderer.toneMapping = THREE.ACESFilmicToneMapping;
    //renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.needsUpdate = true;

    // The API directly updates the camera matrices.
    // Disable matrix auto updates so three.js doesn't attempt
    // to handle the matrices independently.
    const camera = new THREE.PerspectiveCamera();
    camera.matrixAutoUpdate = false;

    // Add scene lighting
    const directionalLight = new THREE.DirectionalLight(0xffffff, 6);
    directionalLight.position.set(0, 2, 1);
    if (this.stationCModel) directionalLight.target = this.stationCModel;
    directionalLight.castShadow = true;
    /*directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    
    directionalLight.shadow.camera.near = 0.01;
    directionalLight.shadow.camera.far = 20;
    directionalLight.shadow.camera.left = -10; // Adjust to cover your scene
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 10;
    directionalLight.shadow.camera.bottom = -10;
    */
    scene.add(directionalLight, directionalLight.target);

    // Initialize a WebXR session using "immersive-ar".
    const session = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["local", "hit-test", "dom-overlay"],
      domOverlay: { root: domOverlay },
    });
    session.updateRenderState({
      baseLayer: new XRWebGLLayer(session, gl),
    });

    // Add stations for experiment
    this.stationA = this.createStationA();
    this.stationA.name = "Station 1";

    this.stationB = this.createStationB();
    this.stationB.name = "Station 2";

    this.stationC = await this.createStationC();
    this.stationC.name = "Station 3";

    this.stationD = await this.createStationD();
    this.stationD.name = "Station 4";

    this.stationE = await this.loadStationE();
    this.stationE.name = "Station 5";

    await Promise.all([this.stationC, this.stationE]);

    // Add a visible bundary around stations
    this.stationARadius = this.createBoundary(this.stationA, scene);
    this.stationBRadius = this.createBoundary(this.stationB, scene);
    this.stationCRadius = this.createBoundary(this.stationC, scene);
    this.stationDRadius = this.createBoundary(this.stationD, scene);
    this.stationERadius = this.createBoundary(this.stationE, scene);

    const testSphere = new THREE.SphereGeometry(0.5, 32, 32);
    const testMaterial = new THREE.MeshStandardMaterial({
      color: 0xffff00,
      roughness: 0.7,
    });
    const testMesh = new THREE.Mesh(testSphere, testMaterial);
    testMesh.position.set(0, 0.5, -1);
    testMesh.castShadow = true;
    testMesh.material.needsUpdate = true;
    scene.add(testMesh);

    // Create a floor plane to receive shadows
    const floorGeometry = new THREE.PlaneGeometry(10, 10);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.7,
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;

    floor.receiveShadow = true;
    floor.material.needsUpdate = true;
    scene.add(floor);

    // A 'local' reference space has a native origin that is located
    // near the viewer's position at the time the session was created.
    const referenceSpace = await session.requestReferenceSpace("local");

    //Create a hit test source
    /*
    To calculate intersections with real-world objects, 
    create a XRHitTestSource using XRSession.requestHitTestSource(). 
    The ray used for hit testing has the viewer reference space as origin, 
    meaning that the hit test is done from the center of the viewport.
    */
    // Create another XRReferenceSpace that has the viewer as the origin.
    const viewerSpace = await session.requestReferenceSpace("viewer");
    // Perform hit testing using the viewer as origin.
    const hitTestSource = await session.requestHitTestSource({
      space: viewerSpace,
    });

    // Create a render loop that allows us to draw on the AR view.
    const onXRFrame = (time, frame) => {
      // Queue up the next draw request.
      session.requestAnimationFrame(onXRFrame);

      // Bind the graphics framebuffer to the baseLayer's framebuffer
      gl.bindFramebuffer(
        gl.FRAMEBUFFER,
        session.renderState.baseLayer.framebuffer
      );

      // Retrieve the pose of the device.
      // XRFrame.getViewerPose can return null while the session attempts to establish tracking.
      const pose = frame.getViewerPose(referenceSpace);
      if (pose) {
        // In mobile AR, we only have one view.
        const view = pose.views[0];

        const viewport = session.renderState.baseLayer.getViewport(view);
        renderer.setSize(viewport.width, viewport.height);

        // Use the view's transform matrix and projection matrix to configure the THREE.camera.
        camera.matrix.fromArray(view.transform.matrix);
        camera.projectionMatrix.fromArray(view.projectionMatrix);
        camera.updateMatrixWorld(true);

        // Make stations facing the camera
        if (this.stationA) {
          this.stationA.lookAt(camera.getWorldPosition(new THREE.Vector3()));
        }
        /*
        if (this.stationE) {
          this.stationE.lookAt(camera.getWorldPosition(new THREE.Vector3()));
        }
*/
        // Check boundaries for all stations
        let closestStation = null;
        let closestBoundary = null;
        let minDistance = Infinity;
        const stations = [
          { station: this.stationA, radius: this.stationARadius },
          { station: this.stationB, radius: this.stationBRadius },
          { station: this.stationC, radius: this.stationCRadius },
          { station: this.stationD, radius: this.stationDRadius },
          { station: this.stationE, radius: this.stationERadius },
        ];

        for (const { station, radius } of stations) {
          const distance = this.boundaryCheck(station, radius, camera);
          if (distance <= 2 && distance < minDistance) {
            closestStation = station;
            closestBoundary = radius;
            minDistance = distance;
          }
        }

        if (closestStation) {
          this.ueq.setAttribute("title", closestStation.name);
          this.ueq.style.display = "flex";
        } else {
          this.ueq.setAttribute("title", "undefined");
          this.ueq.style.display = "none";
        }

        // Drawing a targeting reticle
        const hitTestResults = frame.getHitTestResults(hitTestSource);
        if (hitTestResults.length > 0 && reticle) {
          const hitPose = hitTestResults[0].getPose(referenceSpace);
          reticle.visible = true;
          reticle.position.set(
            hitPose.transform.position.x,
            hitPose.transform.position.y,
            hitPose.transform.position.z
          );
          reticle.updateMatrixWorld(true);

          if (!groundHeightSet) {
            groundHeight = hitPose.transform.position.y;
            groundHeightSet = true;
          }

          if (hitPose.transform.position.y <= groundHeight + 0.01) {
            this.setToFloorPosition(this.stationARadius, hitPose);
            this.setToFloorPosition(this.stationBRadius, hitPose);
            this.setToFloorPosition(this.stationCRadius, hitPose);
            this.setToFloorPosition(this.stationDRadius, hitPose);
            this.setToFloorPosition(this.stationERadius, hitPose);
            this.setToFloorPosition(this.stationC, hitPose);
            this.setToFloorPosition(this.stationD, hitPose);
            this.setToFloorPosition(floor, hitPose);
            if (this.shadowPlane)
              this.setToFloorPosition(this.shadowPlane, hitPose);
          }

          this.boundaryCheck(this.stationA, this.stationARadius, camera);
          this.boundaryCheck(this.stationB, this.stationBRadius, camera);
          this.boundaryCheck(this.stationC, this.stationCRadius, camera);
        }

        // Render the scene with THREE.WebGLRenderer.
        renderer.render(scene, camera);
      }
    };

    session.requestAnimationFrame(onXRFrame);
  }

  createReticle() {
    const geometry = new THREE.RingGeometry(0.1, 0.11, 32);
    const reticle = new THREE.Mesh(geometry, MATERIALS.RETICLE);
    reticle.rotation.x = -Math.PI / 2;
    reticle.visible = false;
    return reticle;
  }

  createStationA() {
    // Create text using troika-three-text
    const text = new Text();
    text.text = TEXTS.STATION_ONE;
    text.fontSize = 0.07; // Adjust the font size
    text.color = 0xffffff;
    text.maxWidth = 0.85; // Ensure the text does not overflow the plane width
    text.overflowWrap = "break-word";
    text.anchorX = "center";
    text.anchorY = "middle";

    // Update the text's geometry
    text.sync();

    // Create a plane geometry to serve as the background for the text
    const planeGeometry = new THREE.PlaneGeometry(1.0, 0.6);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.8,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);

    // Add the text to the plane
    plane.add(text);
    text.position.set(0, 0, 0.01); // Ensure text is slightly in front of the plane to avoid z-fighting

    plane.position.set(
      POSITIONS.STATION_A.x,
      POSITIONS.STATION_A.y,
      POSITIONS.STATION_A.z
    );

    return plane;
  }

  createStationB() {
    // Create text using troika-three-text
    const text = new Text();
    text.text = TEXTS.STATION_TWO;
    text.fontSize = 0.07; // Adjust the font size
    text.color = 0xff0000;
    text.maxWidth = 1; // Ensure the text does not overflow the plane width
    text.overflowWrap = "break-word";
    text.anchorX = "center";
    text.anchorY = "middle";

    const obj = new THREE.Object3D();

    // Update the text's geometry
    text.sync();

    obj.add(text);
    obj.position.set(
      POSITIONS.STATION_B.x,
      POSITIONS.STATION_B.y,
      POSITIONS.STATION_B.z
    );

    return obj;
  }

  createStationC() {
    return new Promise((resolve) => {
      this.gltfLoader.load("/models/custom-model.glb", (gltf) => {
        const model = gltf.scene;

        model.traverse((child) => {
          if (child.isMesh) {
            child.material = MATERIALS.CUSTOM_MODEL;
            child.castShadow = true;
            //child.receiveShadow = true;
            child.material.needsUpdate = true;
          }
        });

        model.position.set(
          POSITIONS.STATION_C.x,
          POSITIONS.STATION_C.y,
          POSITIONS.STATION_C.z
        );
        model.scale.set(0.2, 0.2, 0.2);
        model.rotation.set(0, -Math.PI / 4, 0);

        resolve(model);
      });
    });
  }

  async createStationD() {
    const repeater = 0.05;
    const loader = new FontLoader();
    const texutreLoader = new THREE.TextureLoader();

    const font = new Promise((resolve) => {
      loader.load("/fonts/Arial_Bold.json", (loadedFont) => {
        resolve(loadedFont);
      });
    });

    const albedoMap = new Promise((resolve) => {
      texutreLoader.load("/textures/concrete_albedo.jpg", (texture) => {
        //texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.x = repeater;
        texture.repeat.y = repeater;
        resolve(texture);
      });
    });

    const normalMap = new Promise((resolve) => {
      texutreLoader.load("/textures/concrete_normal.jpg", (texture) => {
        //texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.x = repeater;
        texture.repeat.y = repeater;
        resolve(texture);
      });
    });

    const roughnessMap = new Promise((resolve) => {
      texutreLoader.load("/textures/concrete_roughness.jpg", (texture) => {
        //texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.x = repeater;
        texture.repeat.y = repeater;
        resolve(texture);
      });
    });

    const aoMap = new Promise((resolve) => {
      texutreLoader.load("/textures/concrete_ao.jpg", (texture) => {
        //texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.x = repeater;
        texture.repeat.y = repeater;
        resolve(texture);
      });
    });

    const createTextGeometry = async (text, font, size, height) => {
      const textGeometry = new TextGeometry(text, {
        font: await Promise.resolve(font),
        size: size,
        height: height,
        curveSegments: 24,
        bevelEnabled: false,
        bevelThickness: 5,
        bevelSize: 4,
        bevelOffset: 0,
        bevelSegments: 10,
      });

      return textGeometry;
    };

    const line = TEXTS.STATION_FOUR;
    const lineHeight = 110; // Adjust this value to set the line height
    const textSize = 80;
    const textHeight = 40;

    const geometry = await createTextGeometry(line, font, textSize, textHeight);

    geometry.computeBoundingBox();

    const centerOffset =
      -0.5 * (geometry.boundingBox.max.x - geometry.boundingBox.min.x);

    geometry.translate(centerOffset, 0, 0);
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        map: await Promise.resolve(albedoMap),
        normalMap: await Promise.resolve(normalMap),
        roughnessMap: await Promise.resolve(roughnessMap),
        aoMap: await Promise.resolve(aoMap),
        color: COLOR.WHITE,
      })
    );
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.material.needsUpdate = true;
    mesh.position.set(
      POSITIONS.STATION_D.x,
      POSITIONS.STATION_D.y,
      POSITIONS.STATION_D.z
    );
    //mesh.position.set(0, 0, -1);
    mesh.scale.set(0.01, 0.01, 0.01);
    mesh.rotation.set(0, -Math.PI / 4, 0);
    return mesh;
  }

  loadStationE() {
    return new Promise((resolve) => {
      this.gltfLoader.load("/models/station5.glb", (gltf) => {
        const model = gltf.scene;

        model.position.set(
          POSITIONS.STATION_E.x,
          POSITIONS.STATION_E.y,
          POSITIONS.STATION_E.z
        );

        model.scale.set(0.1, 0.1, 0.1);
        resolve(model);
      });
    });
  }

  boundaryCheck(station, radius, camera) {
    const stationPosition = new THREE.Vector3();
    station.getWorldPosition(stationPosition);
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    const distance = stationPosition.distanceTo(cameraPosition);

    if (distance < 2) {
      radius.material = new THREE.MeshBasicMaterial({
        color: COLOR.INDIGO,
      });
    } else {
      radius.material = MATERIALS.BOUNDARY;
    }

    return distance;
  }

  setToFloorPosition(radius, hitPose, yOffset = false) {
    //groundHeight = hitPose.transform.position.y;
    if (radius) {
      radius.position.set(
        radius.position.x,
        !yOffset
          ? hitPose.transform.position.y
          : hitPose.transform.position.y + 0.01,
        radius.position.z
      );
    }
  }

  createBoundary(station, scene) {
    const radiusGeometry = new THREE.RingGeometry(2, 2.05, 64);
    const radius = new THREE.Mesh(radiusGeometry, MATERIALS.BOUNDARY);
    radius.rotation.x = -Math.PI / 2;
    radius.position.copy(station.position);
    scene.add(radius, station);
    return radius;
  }
}
