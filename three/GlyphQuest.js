import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Text } from "troika-three-text";
import { COLOR, TEXTS, MATERIALS } from "./constants/glyphQuest/index.js";
import { TextGeometry } from "three/addons/geometries/TextGeometry.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";

export default class GlyphQuest {
  constructor() {}

  async activateXR() {
    let floorShadowEnabled = false;

    const domOverlay = document.getElementById("dom-overlay-root");
    this.ueq = document.querySelector(".questionnaire-root");
    // Add a canvas element and initialize a WebGL context that is compatible with WebXR.
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const gl = canvas.getContext("webgl", { xrCompatible: true });

    const scene = new THREE.Scene();

    // Loadings ...
    const loadingManager = new THREE.LoadingManager(
      () => {
        console.log("Loading complete!");
      },
      (item, loaded, total) => {
        console.log("Loading: " + (loaded / total) * 100 + "%");
      }
    );
    const gltfLoader = new GLTFLoader(loadingManager);
    let reticle;
    let customModel = null;
    let stationEModel = null;
    let shadowPlane = null;

    const loadReticle = new Promise((resolve, reject) => {
      gltfLoader.load(
        "https://immersive-web.github.io/webxr-samples/media/gltf/reticle/reticle.gltf",
        function (gltf) {
          reticle = gltf.scene;
          reticle.visible = false;
          scene.add(reticle);
          resolve(reticle);
        },
        undefined,
        function (error) {
          console.error("Error loading reticle:", error);
          reject(error);
        }
      );
    });

    const loadCustomModel = new Promise((resolve, reject) => {
      gltfLoader.load(
        "/models/custom-model.glb",
        function (gltf) {
          customModel = gltf.scene;

          customModel.traverse((child) => {
            if (child.isMesh) {
              child.material = MATERIALS.CUSTOM_MODEL;
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          customModel.position.set(2.5, -0.5, -2);
          customModel.scale.set(0.2, 0.2, 0.2);

          // add shadow plane
          shadowPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(3, 3),
            new THREE.MeshStandardMaterial({ color: 0xffffff })
          );
          shadowPlane.receiveShadow = true;
          shadowPlane.rotation.x = -Math.PI / 2;
          shadowPlane.position.set(2.5, 0, -2);
          scene.add(shadowPlane);
          resolve(customModel);
        },
        undefined,
        function (error) {
          console.error("Error loading custom model:", error);
          reject(error);
        }
      );
    });

    const loadStationFive = new Promise((resolve, reject) => {
      gltfLoader.load(
        "/models/station5.glb",
        function (gltf) {
          stationEModel = gltf.scene;

          stationEModel.position.set(0, 0, -10);
          stationEModel.scale.set(0.1, 0.1, 0.1);
          //scene.add(stationEModel);
          resolve(stationEModel);
        },
        undefined,
        function (error) {
          console.error("Error loading custom model:", error);
          reject(error);
        }
      );
    });

    // Wait for all models to load
    await Promise.all([loadReticle, loadCustomModel, loadStationFive]);

    // Add scene lighting
    const directionalLight = new THREE.DirectionalLight(0xffffff, 6);
    directionalLight.position.set(0, 2, 1);
    if (customModel) directionalLight.target = customModel;
    directionalLight.castShadow = true;
    scene.add(directionalLight, directionalLight.target);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Set up the WebGLRenderer, which handles rendering to the session's base layer.
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      //antialias: true,
      canvas: canvas,
    });
    renderer.xr.enabled = true;

    // The API directly updates the camera matrices.
    // Disable matrix auto updates so three.js doesn't attempt
    // to handle the matrices independently.
    const camera = new THREE.PerspectiveCamera();
    camera.matrixAutoUpdate = false;

    // Initialize a WebXR session using "immersive-ar".
    const session = await navigator.xr.requestSession("immersive-ar", {
      requiredFeatures: ["local", "hit-test", "dom-overlay"],
      domOverlay: { root: domOverlay },
    });
    session.updateRenderState({
      baseLayer: new XRWebGLLayer(session, gl),
    });

    // Add stations for experiment
    this.stationA = this.stationOne();
    this.stationA.name = "Station 1";

    this.stationB = this.stationTwo();
    this.stationB.name = "Station 2";

    this.stationC = customModel;
    this.stationC.name = "Station 3";

    this.stationD = this.stationFour();
    this.stationD.name = "Station 4";

    this.stationE = stationEModel;
    this.stationE.name = "Station 5";

    // Add a visible bundary around stations
    this.stationARadius = this.createBoundary(this.stationA, scene);
    this.stationBRadius = this.createBoundary(this.stationB, scene);
    this.stationCRadius = this.createBoundary(this.stationC, scene);
    this.stationDRadius = this.createBoundary(this.stationD, scene);
    this.stationERadius = this.createBoundary(this.stationE, scene);

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

          this.setToFloorPosition(this.stationARadius, hitPose);
          this.setToFloorPosition(this.stationBRadius, hitPose);
          this.setToFloorPosition(this.stationCRadius, hitPose);
          this.setToFloorPosition(this.stationERadius, hitPose);
          this.setToFloorPosition(this.stationC, hitPose);
          if (shadowPlane) this.setToFloorPosition(shadowPlane, hitPose);

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

  stationOne() {
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
    const planeGeometry = new THREE.PlaneGeometry(0.9, 0.8);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.8,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);

    // Add the text to the plane
    plane.add(text);
    text.position.set(0, 0, 0.01); // Ensure text is slightly in front of the plane to avoid z-fighting

    plane.position.set(-2.5, 0, -2);

    return plane;
  }

  stationTwo() {
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
    obj.position.set(-2.5, 0, -6.5);

    return obj;
  }

  async stationFour() {
    //create some Procedual Text
    // TEXTS.STATION_FOUR
    const loader = new FontLoader();
    let textGeometry;

    await new Promise((resolve, reject) => {
      loader.load(
        "/fonts/Arial_Regular.json",
        (font) => {
          textGeometry = new TextGeometry(TEXTS.STATION_FOUR, {
            font: font,
            size: 80,
            depth: 5,
            curveSegments: 12,
            bevelEnabled: true,
            bevelThickness: 10,
            bevelSize: 8,
            bevelOffset: 0,
            bevelSegments: 5,
          });
          resolve();
        },
        undefined,
        reject
      );
    });
    const material = new THREE.MeshStandardMaterial();
    const mesh = new THREE.Mesh(textGeometry, material);
    mesh.position.set(2.5, 0, -6.5);
    return mesh;
  }

  boundaryCheck(station, radius, camera) {
    const stationPosition = new THREE.Vector3();
    station.getWorldPosition(stationPosition);
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    const distance = stationPosition.distanceTo(cameraPosition);

    if (distance <= 2) {
      radius.material.color.set(COLOR.GREEN);
    } else {
      radius.material.color.set(COLOR.INDIGO);
    }

    return distance;
  }

  setToFloorPosition(radius, hitPose) {
    if (radius) {
      radius.position.set(
        radius.position.x,
        hitPose.transform.position.y,
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
