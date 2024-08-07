import { MSDFTextGeometry, MSDFTextMaterial } from "three-msdf-text-utils";
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

export default class MSDF {
  constructor() {
    // Initialisierung des Lade-Managers, der Ladefortschritt und Abschluss meldet
    const loadingManager = new THREE.LoadingManager(
      () => {
        console.log("Loading complete!");
      },
      (item, loaded, total) => {
        console.log("Loading: " + (loaded / total) * 100 + "%");
      }
    );

    // Initialisierung des GLTFLoaders mit dem Lade-Manager
    this.gltfLoader = new GLTFLoader(loadingManager);

    // Schatteneinstellungen
    this.shadowMapResolution = 2048;
    this.shadowBlur = 50;

    // Radius der Grenze (Boundary) für Stationen
    this.boundaryRadius = 2.05;

    // Variablen für die Speicherung der aktuell besuchten Station und Initialisierung der Liste aller Stationen
    this.currentStation = 0;
    this.stations = [];

    // Uhr zur Zeitmessung
    this.clock = new THREE.Clock();

    // Startet die Experience
    this.start();
  }

  // Ruft startExperience() auf. sofern WebXR vom Browser unterstützt wird
  async start() {
    if ("xr" in navigator) {
      const supported = await navigator.xr.isSessionSupported("immersive-ar");
      if (supported) {
        this.startExperience();
      } else {
        const noArSupport = document.createElement("div");
        noArSupport.classList.add("noxr");
        noArSupport.innerText = "Immersive AR is not supported";
        document.body.appendChild(noArSupport);
      }
    } else {
      alert("WebXR not available in this browser");
    }
  }

  // Hauptfunktion zum Starten der AR-Experience
  async startExperience() {
    let hitTestSource = null;
    let hitTestSourceRequested = false;
    let groundHeight = 0;
    let groundHeightSet = false;

    // Erstellen des Containers für das Rendering
    const container = document.createElement("div");
    container.id = "custom-canvas";
    document.body.appendChild(container);

    // Erstellen der 3D-Szene
    const scene = new THREE.Scene();

    // Hinzufügen von Umgebungslicht zur Szene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Hinzufügen von direktionalem Licht zur Szene
    const directionalLight = new THREE.DirectionalLight(0xffffff, 8);
    directionalLight.position.set(-1, 2, 2);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = this.shadowMapResolution;
    directionalLight.shadow.mapSize.height = this.shadowMapResolution;
    directionalLight.shadow.camera.near = 0.01;
    directionalLight.shadow.camera.far = 20;
    directionalLight.shadow.camera.left = -10; // Anpassen, um Ihre Szene abzudecken
    directionalLight.shadow.camera.right = 10;
    directionalLight.shadow.camera.top = 4;
    directionalLight.shadow.camera.bottom = -4;
    directionalLight.shadow.radius = this.shadowBlur;
    scene.add(directionalLight);

    // Konfiguration des WebGL-Renderers
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

    // Initialisierung der Kamera
    const camera = new THREE.PerspectiveCamera();
    camera.matrixAutoUpdate = false;

    container.appendChild(renderer.domElement);

    // Laden und Abspielen von Audio
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const sound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();

    audioLoader.load("/finish.mp3", function (buffer) {
      sound.setBuffer(buffer);
      sound.loop = false;
      sound.setVolume(0.8);
    });

    // Hinzufügen des AR-Buttons und Konfiguration der erforderlichen Features
    const arButton = ARButton.createButton(renderer, {
      requiredFeatures: [
        "local",
        "hit-test",
        "dom-overlay",
        "light-estimation",
      ],
    });
    document.body.appendChild(arButton);

    // Erstellen eines "Fadenkreuzes" für Hit-Tests
    const reticleGeometry = new THREE.RingGeometry(0.1, 0.11, 32);
    const reticle = new THREE.Mesh(reticleGeometry, MATERIALS.RETICLE);
    reticle.rotation.x = -Math.PI / 2;
    reticle.visible = false;
    scene.add(reticle);

    // Erstellen einer Schattenebene
    const shadowGeometry = new THREE.PlaneGeometry(5, 5);
    const shadowMaterial = new THREE.ShadowMaterial({
      opacity: 0.2,
    });
    const shadowPlane = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.receiveShadow = true;
    shadowPlane.material.needsUpdate = true;
    shadowPlane.position.set(POSITIONS.INIT.x, 0, POSITIONS.INIT.z);
    scene.add(shadowPlane);

    // Erstellen und Hinzufügen der Stationen zur Szene
    const stationA = await this.createStationA();
    stationA.name = "Station A";
    stationA.visible = true;
    scene.add(stationA);

    const stationB = this.createStationB();
    stationB.name = "Station B";
    scene.add(stationB);

    this.stations = [stationA, stationB];

    // Animationsfunktion
    const animate = () => {
      renderer.setAnimationLoop(render);
    };

    // Render-Funktion für die Szene
    const render = async (timestamp, frame) => {
      if (frame) {
        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();
        const lightProbe = await session.requestLightProbe();
        const lightEstimation = frame.getLightEstimate(lightProbe);

        if (lightEstimation) {
          const { primaryLightDirection, primaryLightIntensity } =
            lightEstimation;

          if (primaryLightDirection) {
            directionalLight.position.set(
              primaryLightDirection.x,
              primaryLightDirection.y,
              primaryLightDirection.z
            );
          }

          if (primaryLightIntensity) {
            directionalLight.intensity = primaryLightIntensity.y; // Using Y component as an example
          }
        }

        // Hit-Test-Quelle anfordern, falls noch nicht geschehen
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

        // Verarbeiten der Hit-Test-Ergebnisse
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

            // Matrix dekomponieren, um Quaternion zu erhalten
            reticle.matrix.decompose(position, quaternion, scale);

            if (!groundHeightSet) {
              groundHeight = position.y;
              groundHeightSet = true;
            }

            // Position einiger Stationen auf den Boden setzen
            if (position.y <= groundHeight + 0.001) {
              this.setToFloorPosition(shadowPlane, hitPose);
            }

            reticle.position.set(position.x, position.y, position.z);
          } else {
            reticle.visible = false;
          }
        }

        // Billboard-Effekt aktivieren, sodass Station A der Kamera folgt
        if (stationA) {
          //stationA.lookAt(camera.getWorldPosition(new THREE.Vector3()));
        }

        const delta = this.clock.getDelta();

        // Animations-Mixer aktualisieren
        if (this.mixer) this.mixer.update(delta);

        // Szene rendern
        renderer.render(scene, camera);
      }
    };
    animate();
  }

  // Erstellt ein "Fadenkreuz" für die Hit-Tests
  createReticle() {
    const geometry = new THREE.RingGeometry(0.1, 0.11, 32);
    const reticle = new THREE.Mesh(geometry, MATERIALS.RETICLE);
    reticle.rotation.x = -Math.PI / 2;
    reticle.visible = false;
    return reticle;
  }

  // Erstellt Station A mit Text
  createStationA() {
    return new Promise((resolve, reject) => {
      Promise.all([
        this.loadFontAtlas("/fonts/Arial.png"),
        this.loadFont("/fonts/Arial-msdf.json"),
      ])
        .then(([atlas, font]) => {
          const geometry = new MSDFTextGeometry({
            text: `A`,
            font: font.data,
          });

          const material = new MSDFTextMaterial();
          material.uniforms.uMap.value = atlas;
          material.side = THREE.DoubleSide;
          //material.uniforms.uColor.value = { r: 0, g: 0, b: 0 };

          const mesh = new THREE.Mesh(geometry, material);
          mesh.scale.set(0.016, 0.016, 0.016);
          mesh.rotation.y = Math.PI;
          mesh.rotation.z = Math.PI;
          mesh.position.set(-0.35, -0.145, -1);
          resolve(mesh);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  createStationB() {
    const text = new Text();
    text.text = `A`;
    text.font = "/fonts/Arial.ttf";
    text.fontSize = 0.7; // Schriftgröße anpassen
    //text.color = 0xffffff;
    //text.maxWidth = 1; // Textbreite anpassen
    text.overflowWrap = "break-word";
    text.anchorX = "center";
    text.anchorY = "middle";
    text.textAlign = "center";

    text.sync();

    text.position.set(0.35, POSITIONS.INIT.y, -1);
    //obj.visible = false;

    return text;
  }

  loadFontAtlas(path) {
    const promise = new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      loader.load(path, resolve);
    });

    return promise;
  }

  loadFont(path) {
    const promise = new Promise((resolve, reject) => {
      const loader = new FontLoader();
      loader.load(path, resolve);
    });

    return promise;
  }

  // Setzt die Position eines Objekts auf den Boden basierend auf der Hit-Test-Position
  setToFloorPosition(radius, hitPose, yOffset = false) {
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
}
