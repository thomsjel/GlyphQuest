import Head from "next/head";
import { Inter, Work_Sans } from "next/font/google";
import HomeIcon from "@mui/icons-material/Home";
import ViewInArIcon from "@mui/icons-material/ViewInAr";
import CameraIcon from "@mui/icons-material/Camera";
import BallotIcon from "@mui/icons-material/Ballot";
import styles from "@/styles/Home.module.css";
import Image from "next/image";

import { useEffect, useState, useRef, createRef } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
//import * as THREEx from "../../node_modules/@ar-js-org/ar.js/three.js/build/ar-threex-location-only.js"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import { Text } from "troika-three-text";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
//import SplineLoader from "@splinetool/loader";
import { onWindowResize, addQuestOne, getUserLocation } from "@/utils/helpers";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { MaskPass } from "three/addons/postprocessing/MaskPass.js";
import { ClearPass } from "three/addons/postprocessing/ClearPass.js";

import Stats from "three/addons/libs/stats.module.js";

import { vlInit, generateLaunchCode, generateQRCode } from "@/utils/vl";
import useIsApple from "@/hooks/useIsApple";
import DomOverlayContent from "@/components/DomOverlayContent";
import Portal from "@/components/Portal";
import { useScreenshot } from "use-react-screenshot";

const inter = Inter({ subsets: ["latin"] });
const workSans = Work_Sans({ subsets: ["latin"] });

export default function Home() {
  const [sessionActive, setSessionActive] = useState(false);
  const [isXrSupported, setIsXrSupported] = useState();

  const isApple = useIsApple();

  const ref = createRef(null);
  const imageRef = useRef(null);
  const [width, setWidth] = useState(300);
  const [image, takeScreenShot] = useScreenshot();

  const vlaunchInitialized = useRef(false);
  const eventListenerAdded = useRef(false);

  const uiRef = useRef();
  const buttonBackRef = useRef();
  const buttonCaptureRef = useRef();
  const buttonObjectsRef = useRef();
  const canvasRef = useRef();

  const router = useRouter();

  const options = {
    enableSwoopingCamera: false,
    enableRotation: false,
    color: 0xffffff,
    metalness: 0,
    roughness: 1,
    transmission: 0.92,
    ior: 1.5,
    reflectivity: 0.3,
    thickness: 4,
    //envMapIntensity: 1.5,
    //clearcoat: 0,
    //clearcoatRoughness: 1,
    normalScale: 0.1,
    //clearcoatNormalScale: 1,
    normalRepeat: 3,
    // attenuationTint: 0xffffff,
    // attenuationDistance: 0,
    bloomThreshold: 0.85,
    bloomStrength: 0.35,
    bloomRadius: 0.33,
  };

  useEffect(() => {
    const qrCode = document.getElementById("qr-code");
    const arUI = document.getElementById("ar-ui");
    const statsDom = document.getElementById("stats");
    const domOverlay = document.getElementById("dom-overlay-root");
    const trackingPrompt = document.getElementById("tracking-prompt");
    const instructions = document.getElementById("instructions");
    const instructions2 = document.getElementById("instructions2");
    const compassElement = document.getElementById("compass");
    const headingElement = document.getElementById("heading");
    const directionElement = document.getElementById("direction");

    uiRef.current = document.getElementById("dom-overlay");
    const plantSelector = document.getElementById("plants");
    const settings = document.getElementById("options");
    const buttons = document.getElementById("buttons");
    buttonBackRef.current = document.getElementById("button-back");
    buttonCaptureRef.current = document.getElementById("button-capture");
    buttonObjectsRef.current = document.getElementById("button-objects");
    canvasRef.current = document.getElementById("custom-cavnas");

    const getImage = () => takeScreenShot(uiRef.current);

    //VLauncher
    if (!vlaunchInitialized.current && isApple) {
      vlInit();
      vlaunchInitialized.current = true;
    }

    if (!eventListenerAdded.current && isApple) {
      const qrCode = document.getElementById("qr-code");
      if (qrCode) {
        window.addEventListener("vlaunch-initialized", (e) => {
          generateLaunchCode(qrCode);
        });

        if (VLaunch.initialized) {
          generateLaunchCode(qrCode);
        } else {
          generateQRCode(window.location.href, qrCode);
        }

        eventListenerAdded.current = true;
      }
    }

    //WebXR + Three.js
    let container;
    let camera, scene, renderer, composer;
    let renderTarget;
    let floorPosition, floorPlane;
    let floorShadowEnabled = false;

    let reticle;
    let reticleColorDefault = "#00ff00";
    let reticleColorWall = "#ff0000";

    let hitTestSource = null;
    let hitTestSourceRequested = false;
    let planeFound = false;
    let isFloor = true;
    let flowersGltf;
    let wallGrass1;
    let bill1, threeText;

    const stats = new Stats();

    //check for webxr session support
    const checkXRSupport = async () => {
      if ("xr" in navigator) {
        const supported = await navigator.xr.isSessionSupported("immersive-ar");
        setIsXrSupported(supported);
        if (supported && !sessionActive) {
          init();
          animate();
        }
      } else {
        console.warn("WebXR not available in this browser");
      }
    };

    setTimeout(() => checkXRSupport(), 50);

    const sessionStart = async () => {
      planeFound = false;
      setSessionActive(true);
      if (trackingPrompt) {
        trackingPrompt.style.display = "block";
      }
    };

    const init = () => {
      container = document.createElement("div");
      container.id = "custom-canvas";
      document.body.appendChild(container);

      scene = new THREE.Scene();

      camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        100
      );

      //light
      const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
      hemisphereLight.position.set(0.5, 1, 0.25);
      hemisphereLight.castShadow = false;
      const directionalLight = new THREE.DirectionalLight(0xffffff, 4);
      directionalLight.position.set(1, 4, 3);
      directionalLight.castShadow = true;
      scene.add(directionalLight);

      //renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setClearAlpha(1);
      renderer.xr.enabled = true;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      renderTarget = new THREE.WebGLRenderTarget(
        window.innerWidth,
        window.innerHeight
      );

      addQuestOne(renderTarget, camera, scene);

      container.appendChild(renderer.domElement);
      renderer.xr.addEventListener("sessionstart", sessionStart);

      const arButton = ARButton.createButton(renderer, {
        requiredFeatures: ["local", "hit-test", "dom-overlay"],
        domOverlay: { root: domOverlay },
      });
      document.body.appendChild(arButton);
      arButton.addEventListener("click", () => {
        if (arUI) {
          arUI.style.display = "flex";
          //arUI.appendChild(stats.dom);
        }

        if (statsDom) {
          statsDom.appendChild(stats.dom);
          stats.dom.style.position = "absolute";
          stats.dom.style.top = "0px";
          stats.dom.style.left = "0px";
        }
        //getRealTimePosition();
        //deviceMotion();
      });

      const instantiateObject = (gltf, isFloorCapable, canPlaceOnWall) => {
        //check if the object can be placed based on current isFloor state
        if ((isFloor && isFloorCapable) || (!isFloor && canPlaceOnWall)) {
          if (reticle.visible && gltf) {
            const object =
              gltf.children[Math.floor(Math.random() * gltf.children.length)];
            const mesh = object.clone();

            reticle.matrix.decompose(
              mesh.position,
              mesh.quaternion,
              mesh.scale
            );
            mesh.position.y = -2;
            const scale = Math.random() * 0.4 + 0.25;
            mesh.scale.set(scale, scale, scale);
            mesh.rotateY(Math.random() * Math.PI * 2); // Random rotation
            scene.add(mesh);

            // Optional: Animate the object (e.g., for growth animation)
            const interval = setInterval(() => {
              mesh.scale.multiplyScalar(1.01);
              mesh.rotateY(0.03);
            }, 16);
            setTimeout(() => clearInterval(interval), 500);
          }
        }
      };

      reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.18, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: reticleColorDefault })
      );
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);

      if (uiRef.current) {
        uiRef.current.addEventListener("click", (event) => {
          //instructions.textContent = `${event.target.id}`
          if (event.target.id === "ar-ui") {
            switch (plantSelector.value) {
              case "grass1":
                //floor only
                instantiateObject(threeText, true, false);

                break;
              case "grass2":
                instantiateObject(threeText, false, true);
                break;
            }
          } else {
            console.log("This is a UI element");
          }
        });
      }

      if (buttonBackRef.current) {
        buttonBackRef.current.addEventListener("click", () => {
          endSessionAndNavigate();
        });
      }

      if (buttonCaptureRef.current) {
        buttonCaptureRef.current.addEventListener("click", () => {
          capture();
        });
      }

      const hdrEquirect = new RGBELoader().load(
        "/empty_warehouse_01_2k.hdr",
        () => {
          hdrEquirect.mapping = THREE.EquirectangularReflectionMapping;
        }
      );

      const loadingManager = new THREE.LoadingManager();
      loadingManager.onStart = () => {};
      loadingManager.onLoad = () => {
        //instructions2.textContent = "loading finished";
      };
      loadingManager.onProgress = () => {
        //instructions2.textContent = "loading progressing";
      };
      loadingManager.onError = () => {
        //instructions2.textContent = "loading error";
      };
      const textureLoader = new THREE.TextureLoader(loadingManager);

      const colorTexture = textureLoader.load("/textures/lime-albedo.png");
      /*colorTexture.colorSpace = THREE.SRGBColorSpace;
      colorTexture.generateMipmaps = false;
      colorTexture.minFilter = THREE.NearestFilter;
      colorTexture.magFilter = THREE.NearestFilter;
      */
      const heightTexture = textureLoader.load("/textures/lime-height.png");
      const normalTexture = textureLoader.load("/textures/lime-normal.png");
      const ambientOcclusionTexture = textureLoader.load(
        "/textures/lime-ao.png"
      );

      //load flowers.glb
      const loader = new GLTFLoader();

      loader.load("/models/endlich.glb", (gltf) => {
        threeText = gltf.scene;
        threeText.scale.set(0.5, 0.5, 0.5);
        threeText.position
          .copy(camera.position)
          .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1));
        scene.add(threeText);
        threeText.customAttribute = "model";
        threeText.children.forEach((child) => {
          instructions.textContent += child.name;
          child.castShadow = false;
          child.receiveShadow = false;

          child.children.forEach((subChild) => {
            subChild.castShadow = false;
            subChild.receiveShadow = true;

            let material = new THREE.MeshStandardMaterial({
              map: colorTexture,
              normalMap: normalTexture,
              aoMap: ambientOcclusionTexture,
              //envMap: hdrEquirect,
              //envMapIntensity: 0.4,
              roughness: 0.9,
              metalness: 0.2,
              //side: THREE.DoubleSide,
            });
            subChild.material = material;
          });
        });
      });

      window.addEventListener("resize", () => onWindowResize(camera, renderer));
    };

    const enableFloorShadow = (floorPosition) => {
      floorShadowEnabled = true;

      threeText.children[0].children[0].castShadow = true;
      threeText.children[0].children[0].receiveShadow = true;
      //floor
      const floorGeometry = new THREE.PlaneGeometry(10, 10);
      const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
      floorPlane = new THREE.Mesh(floorGeometry, floorMaterial);
      floorPlane.receiveShadow = true;
      floorPlane.rotation.x = -Math.PI / 2;
      floorPlane.position.set(0, floorPosition, 0);
      scene.add(floorPlane);
      /*
      //Create a plane that receives shadows (but does not cast them)
      const planeGeometry = new THREE.PlaneGeometry(10, 10);
      const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
      const plane = new THREE.Mesh(planeGeometry, planeMaterial);
      plane.receiveShadow = true;
      scene.add(plane);*/
    };

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

          session.addEventListener("end", function () {
            hitTestSourceRequested = false;
            hitTestSource = null;
          });

          hitTestSourceRequested = true;
        }

        if (hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);

          if (hitTestResults.length) {
            if (!planeFound) {
              planeFound = true;
              if (trackingPrompt) {
                trackingPrompt.style.display = "none";
              }
              if (instructions) {
                instructions.style.display = "flex";
              }
            }
            const hit = hitTestResults[0];

            reticle.visible = true;
            reticle.matrix.fromArray(
              hit.getPose(referenceSpace).transform.matrix
            );

            let position = new THREE.Vector3();
            let quaternion = new THREE.Quaternion();
            let scale = new THREE.Vector3();

            // Decompose the matrix to get the quaternion
            reticle.matrix.decompose(position, quaternion, scale);
            floorPosition = position.y;
            if (floorPosition && !floorShadowEnabled) {
              threeText.position.set(0, floorPosition - 1, -0.1);
              enableFloorShadow(floorPosition);
            }
            //debug wall detection
            //instructions2.textContent = `Quat.x: ${quaternion.x} \n Quat.z: ${quaternion.z} \n Quat.y: ${quaternion.y} \n Quat.w: ${quaternion.w} `;

            //floor: 0.00159944096
            if (quaternion.x > 0.01) {
              updateColor(reticle, reticleColorWall);
              isFloor = false;
              //instructions2.textContent = `Quat.x: ${quaternion.x}`;
              //plantSelector.value = "grass2";
            } else {
              updateColor(reticle, reticleColorDefault);
              isFloor = true;
              //instructions2.textContent = "Wähle eine Bodenpflanze";
              //plantSelector.value = "grass1";
            }
          } else {
            reticle.visible = false;
          }
        }
      }

      stats.update();

      renderer.render(scene, camera);
    };

    const updateColor = (object3d, newColor) => {
      object3d.material.color.set(newColor);
      // If you're not using an animation loop, explicitly render the scene here
      // renderer.render(scene, camera);
    };

    const endSessionAndNavigate = () => {
      const session = renderer.xr.getSession();
      if (session) {
        session
          .end()
          .then(() => {
            console.log("WebXR session ended");
            navigateToLandingPage();
          })
          .catch((err) => {
            console.error("Failed to end the WebXR session", err);
          });
      } else {
        navigateToLandingPage();
      }
    };

    const showOptions = (value) => {
      if (value) {
        settings.style.display = "flex"; // Make the select visible
        buttons.style.borderTopLeftRadius = "0px";
        buttons.style.borderTopRightRadius = "0px";
      } else {
        settings.style.display = "none"; // Optional: hide it again if button is clicked a second time
        buttons.style.borderTopLeftRadius = "25px";
        buttons.style.borderTopRightRadius = "25px";
      }
    };

    const capture = async () => {
      alert("TODO: Snapshot Fn");
    };
  }, [isXrSupported]);

  return (
    <>
      <Head>
        <title>GlyphQuest - Start</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Portal>
        <div ref={ref} id="dom-overlay">
          <div id="tracking-prompt">
            <img src="/hand.png" alt="Tracking prompt" />
          </div>
          <div id="instructions"></div>
          <div id="instructions2"></div>
          <div id="direction"></div>
          <div id="stats"></div>
          <div id="ar-ui">
            <div id="headline">
              <h2 className="headline">
                <span>Glyph</span>
                <span>Quest</span>
              </h2>

              {/*<img width={200} height={200} src={image} alt="Screenshot" />*/}
              {/*<img id="compass" src="/compass.png" alt="compass" />*/}
              {/*<div id="heading">0°</div>*/}
            </div>
            <div id="buttons" data-ui="true" className="buttons">
              <div id="options" className="options">
                <select name="plants" id="plants" className="plants-selector">
                  <option value="grass1">Bodenpflanze</option>
                  <option value="grass2">Fasadenbegrünung</option>
                </select>
              </div>

              <button id="button-objects" data-active="false">
                {/* <ViewInArIcon />*/}
              </button>
              {/*<button id="button-load-scene">Load</button>
                            <button id="button-save-scene">Save</button>*/}
              <button id="open-poll">
                <BallotIcon />
              </button>
              <button id="button-back" onClick={() => alert("TODO")}>
                {/*<HomeIcon />*/}
              </button>
            </div>
          </div>
        </div>
      </Portal>
      {/*<Script src="https://launchar.app/sdk/v1?key=lHcZsoFPajEPjnXG8NrQ09SNoZgMj5dP&redirect=true" strategy="beforeInteractive" />*/}
      <main className={`${styles.main}`}>
        <div id="app" className="ar-not-supported">
          {!isXrSupported && (
            <div id="ar-not-supported">
              <p>
                WebXR Not Supported. Open this page on iOS or Android to view
                the example.
              </p>
              <img id="qr-code" />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
