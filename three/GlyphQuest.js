import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Text } from "troika-three-text";

const COLOR = {
  INDIGO: 0x818cf8,
  GREEN: 0x00ff00,
};

export default class GlyphQuest {
  constructor() {}

  async activateXR() {
    const domOverlay = document.getElementById("dom-overlay-root");
    this.ueq = document.querySelector(".questionnaire-root");
    // Add a canvas element and initialize a WebGL context that is compatible with WebXR.
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    const gl = canvas.getContext("webgl", { xrCompatible: true });

    const scene = new THREE.Scene();

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(10, 15, 10);
    scene.add(directionalLight);

    // Set up the WebGLRenderer, which handles rendering to the session's base layer.
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      preserveDrawingBuffer: true,
      canvas: canvas,
      context: gl,
    });
    renderer.autoClear = false;

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

    // Add a visible radius around stationA
    const radiusGeometry = new THREE.RingGeometry(2, 2.05, 64);

    this.stationARadius = new THREE.Mesh(
      radiusGeometry,
      new THREE.MeshBasicMaterial({
        color: COLOR.INDIGO,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      })
    );
    this.stationARadius.rotation.x = -Math.PI / 2;
    this.stationARadius.position.copy(this.stationA.position);

    this.stationBRadius = new THREE.Mesh(
      radiusGeometry,
      new THREE.MeshBasicMaterial({
        color: COLOR.INDIGO,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      })
    );
    this.stationBRadius.rotation.x = -Math.PI / 2;
    this.stationBRadius.position.copy(this.stationB.position);

    scene.add(
      this.stationA,
      this.stationARadius,
      this.stationB,
      this.stationBRadius
    );

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

    const loadingManager = new THREE.LoadingManager(
      () => {
        console.log("Loading complete!");
      },
      (item, loaded, total) => {
        console.log("Loading: " + (loaded / total) * 100 + "%");
      }
    );

    const loader = new GLTFLoader(loadingManager);
    let reticle;
    loader.load(
      "https://immersive-web.github.io/webxr-samples/media/gltf/reticle/reticle.gltf",
      function (gltf) {
        reticle = gltf.scene;
        reticle.visible = false;
        scene.add(reticle);
      }
    );

    let flower;
    loader.load(
      "https://immersive-web.github.io/webxr-samples/media/gltf/sunflower/sunflower.gltf",
      function (gltf) {
        flower = gltf.scene;
      }
    );

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

        // Make stationA face the camera
        if (this.stationA) {
          this.stationA.lookAt(camera.getWorldPosition(new THREE.Vector3()));
        }

        // Check boundaries for both stations
        let closestStation = null;
        let minDistance = Infinity;
        const stations = [
          { station: this.stationA, radius: this.stationARadius },
          { station: this.stationB, radius: this.stationBRadius },
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

          if (this.stationARadius) {
            this.stationARadius.position.set(
              this.stationARadius.position.x,
              hitPose.transform.position.y,
              this.stationARadius.position.z
            );

            if (this.stationBRadius) {
              this.stationBRadius.position.set(
                this.stationBRadius.position.x,
                hitPose.transform.position.y,
                this.stationBRadius.position.z
              );
            }

            this.boundaryCheck(this.stationA, this.stationARadius, camera);
            this.boundaryCheck(this.stationB, this.stationBRadius, camera);
          }
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
    text.text =
      "Gutenberg druckte in Mainz das erste Buch mit beweglichen Bleilettern und löste damit eine Medienrevolution aus.";
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

    plane.position.set(0, 0, -2);

    return plane;
  }

  stationTwo() {
    // Create text using troika-three-text
    const text = new Text();
    text.text =
      "Ligaturen sind Buchstabenverbindungen, um Leerräume oder Überschneidungen mit nebenstehenden Buchstaben zu vermeiden.";
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
    obj.position.set(0, 0, -6.5);

    return obj;
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
}
