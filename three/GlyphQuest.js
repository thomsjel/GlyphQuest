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

  // Setzt die aktuelle Station und aktualisiert die Sichtbarkeit der Stationen
  setCurrentStation(station) {
    this.currentStation = station;

    this.updateStationVisibility();
  }

  // Aktualisiert die Sichtbarkeit der Stationen basierend auf der aktuellen Station
  updateStationVisibility() {
    const ueq = document.getElementById("ueq");
    ueq.style.display = "none";
    this.stations.forEach((station, index) => {
      if (station) {
        station.visible = index === this.currentStation;
      }
    });
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

    const domOverlay = document.getElementById("dom-overlay-root");
    const ueq = document.getElementById("ueq");
    const ueqButton = document.getElementById("ueqs-button");

    const intro = document.getElementById("intro");

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
      domOverlay: { root: domOverlay },
    });
    document.body.appendChild(arButton);

    // Entfernen des Intro-Screens nach Klick auf den AR-Button
    arButton.addEventListener("click", () => {
      intro.style.display = "none";
      ueqButton.style.display = "flex";
    });

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

    const stationE = await this.createStationE();
    stationE.name = "Station E";
    scene.add(stationE);

    const finalAnimation = await this.showFinalAnimation();
    finalAnimation.name = "Final Animation";
    scene.add(finalAnimation);

    this.stations = [
      stationA,
      stationB,
      stationC,
      stationD,
      stationE,
      finalAnimation,
    ];

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
              this.setToFloorPosition(stationC, hitPose);
              this.setToFloorPosition(stationD, hitPose);
              this.setToFloorPosition(finalAnimation, hitPose);
              this.setToFloorPosition(shadowPlane, hitPose);
            }

            reticle.position.set(position.x, position.y, position.z);
          } else {
            reticle.visible = false;
          }
        }

        // Überprüfen der Grenzen für alle Stationen
        let closestStation = null;
        let minDistance = Infinity;
        const stations = [
          { station: stationA },
          { station: stationB },
          { station: stationC },
          { station: stationD },
          { station: stationE },
        ];

        for (const { station } of stations) {
          const distance = this.boundaryCheck(station, camera);
          if (distance < this.boundaryRadius && distance < minDistance) {
            closestStation = station;
            minDistance = distance;
          }
        }

        const stationNames = [
          "Station A",
          "Station B",
          "Station C",
          "Station D",
          "Station E",
        ];

        // UI-Button für die aktuelle Station aktualisieren
        if (this.currentStation < 5) {
          ueqButton.addEventListener("click", () => {
            ueq.setAttribute("title", stationNames[this.currentStation]);
            ueq.style.display = "flex";
          });
        } else {
          ueqButton.innerText = "Zurück";
          ueqButton.addEventListener("click", () => {
            window.location.href = "/";
          });
          if (!sound.isPlaying) {
            sound.play();
          }
        }

        // Billboard-Effekt aktivieren, sodass Station A der Kamera folgt
        if (stationA) {
          stationA.lookAt(camera.getWorldPosition(new THREE.Vector3()));
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
    const text = new Text();
    text.font = "/fonts/Arial.ttf";
    text.text = TEXTS.STATION_ONE;
    text.fontSize = 0.07; // Schriftgröße anpassen
    text.color = 0xffffff;
    text.maxWidth = 0.85; // Textbreite anpassen
    text.overflowWrap = "break-word";
    text.anchorX = "center";
    text.anchorY = "middle";
    text.textAlign = "justify";

    // Aktualisierung der Text-Geometrie
    text.sync();

    const planeGeometry = new THREE.PlaneGeometry(1.0, 0.6);
    const planeMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.8,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);

    plane.add(text);
    text.position.set(0, 0, 0.01); // Text leicht vor die Billboard-Ebene setzen

    plane.position.set(POSITIONS.INIT.x, POSITIONS.INIT.y, POSITIONS.INIT.z);
    plane.visible = true;

    return plane;
  }

  // Erstellt Station B mit Text
  createStationB() {
    const text = new Text();
    text.text = TEXTS.STATION_TWO;
    text.font = "/fonts/Arial.ttf";
    text.fontSize = 0.07; // Schriftgröße anpassen
    text.color = 0xff0000;
    text.maxWidth = 1; // Textbreite anpassen
    text.overflowWrap = "break-word";
    text.anchorX = "center";
    text.anchorY = "middle";
    text.textAlign = "center";

    const obj = new THREE.Object3D();

    text.sync();

    obj.add(text);
    obj.position.set(POSITIONS.INIT.x, POSITIONS.INIT.y, POSITIONS.INIT.z);
    obj.visible = false;

    return obj;
  }

  // Erstellt Station C mit einem 3D-Modell
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
          POSITIONS.INIT.x,
          POSITIONS.INIT.y,
          POSITIONS.INIT.z
        );
        model.scale.set(0.2, 0.2, 0.2);
        //model.rotation.set(0, -Math.PI / 4, 0);
        model.visible = false;

        resolve(model);
      });
    });
  }

  // Erstellt Station D mit einem Text, der verschiedene Texturen verwendet
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
    mesh.position.set(POSITIONS.INIT.x, POSITIONS.INIT.y, POSITIONS.INIT.z);
    mesh.scale.set(0.01, 0.01, 0.01);
    mesh.visible = false;
    return mesh;
  }

  // Erstellt Station E mit einem 3D-Modell
  createStationE() {
    return new Promise((resolve) => {
      this.gltfLoader.load("/models/station5.glb", (gltf) => {
        const model = gltf.scene;

        model.position.set(POSITIONS.INIT.x, -0.3, POSITIONS.INIT.z);

        model.scale.set(0.1, 0.1, 0.1);
        model.visible = false;
        resolve(model);
      });
    });
  }

  // Zeigt die finale Animation mit einem 3D-Modell
  showFinalAnimation() {
    return new Promise((resolve) => {
      this.gltfLoader.load("/models/mannequin.glb", (gltf) => {
        const model = gltf.scene;

        model.position.set(POSITIONS.INIT.x, 0, POSITIONS.INIT.z);

        model.traverse((child) => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: COLOR.INDIGO,
              roughness: 0.3,
              metalness: 0,
            });
            child.castShadow = true;
            //child.receiveShadow = true;
            child.material.needsUpdate = true;
          }
        });

        gltf.animations.forEach((clip) => {
          this.mixer = new THREE.AnimationMixer(model);
          this.mixer.clipAction(clip).play();
        });

        model.visible = false;
        resolve(model);
      });
    });
  }

  // Überprüft die Distanz zwischen der Station und der Kamera
  boundaryCheck(station, camera) {
    const stationPosition = new THREE.Vector3();
    station.getWorldPosition(stationPosition);
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);
    const distance = stationPosition.distanceTo(cameraPosition);

    return distance;
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

  // Erstellt eine visuelle Begrenzung um eine Station und fügt sie der Szene hinzu
  createBoundary(station, scene) {
    const radiusGeometry = new THREE.RingGeometry(2, this.boundaryRadius, 64);
    const radius = new THREE.Mesh(radiusGeometry, MATERIALS.BOUNDARY);
    radius.rotation.x = -Math.PI / 2;
    radius.position.copy(station.position);
    scene.add(radius, station);
    return radius;
  }
}
