import GlyphQuest from "@/three/GlyphQuest";
import { useEffect, useRef, useState } from "react";
import Questionnaire from "@/components/forms/Questionnaire";
import Portal from "@/components/Portal";
import { ARButton } from "three/examples/jsm/webxr/ARButton.js";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { onWindowResize, addQuestOne, getUserLocation } from "@/utils/helpers";

export default function Home() {
  const [sessionActive, setSessionActive] = useState(false);
  const [isXrSupported, setIsXrSupported] = useState();

  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [form, setForm] = useState(0);

  useEffect(() => {
    const domOverlay = document.getElementById("dom-overlay-root");
    const trackingPrompt = document.getElementById("tracking-prompt");
    const instructions = document.getElementById("instructions");

    //WebXR + Three.js
    let container;
    let camera, scene, renderer;
    let floorPosition, floorPlane;
    let floorShadowEnabled = false;

    let reticle;
    let reticleColorDefault = "#00ff00";

    let hitTestSource = null;
    let hitTestSourceRequested = false;
    let planeFound = false;
    let customModel;

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

      container.appendChild(renderer.domElement);
      renderer.xr.addEventListener("sessionstart", sessionStart);

      const arButton = ARButton.createButton(renderer, {
        requiredFeatures: ["local", "hit-test", "dom-overlay"],
        domOverlay: { root: domOverlay },
      });
      document.body.appendChild(arButton);
      arButton.addEventListener("click", () => {});

      reticle = new THREE.Mesh(
        new THREE.RingGeometry(0.18, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: reticleColorDefault })
      );
      reticle.matrixAutoUpdate = false;
      reticle.visible = false;
      scene.add(reticle);

      //load flowers.glb
      const loader = new GLTFLoader();

      loader.load("/models/custom-model.glb", (gltf) => {
        customModel = gltf.scene;
        customModel.scale.set(0.2, 0.2, 0.2);
        customModel.position
          .copy(camera.position)
          .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1));
        scene.add(customModel);
        customModel.customAttribute = "model";
        customModel.traverse((child) => {
          if (child.isMesh) {
            child.material = MATERIALS.CUSTOM_MODEL;
          }
        });
      });

      window.addEventListener("resize", () => onWindowResize(camera, renderer));
    };

    const enableFloorShadow = (floorPosition) => {
      floorShadowEnabled = true;
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      customModel.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      //floor
      const floorGeometry = new THREE.PlaneGeometry(10, 10);
      const floorMaterial = new THREE.ShadowMaterial({ opacity: 0.8 });
      floorPlane = new THREE.Mesh(floorGeometry, floorMaterial);
      floorPlane.receiveShadow = true;
      floorPlane.rotation.x = -Math.PI / 2;
      floorPlane.position.set(0, floorPosition, 0);
      scene.add(floorPlane);
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

          hitTestSourceRequested = true;
        }

        if (hitTestSource) {
          const hitTestResults = frame.getHitTestResults(hitTestSource);

          if (hitTestResults.length) {
            if (!planeFound) {
              planeFound = true;
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
              customModel.position.set(0, floorPosition - 1, -0.1);
              enableFloorShadow(floorPosition);
            }
          } else {
            reticle.visible = false;
          }
        }
      }

      renderer.render(scene, camera);
    };
  }, [isXrSupported]);

  return (
    <>
      <Portal>
        <div
          style={{
            height: "200px",
            width: "200px",
            display: "flex",
            justifyContent: "start",
            alignItems: "start",
            position: "absolute",
            top: "20%",
            color: "black",
            display: "flex",
            flexDirection: "column",
          }}
        ></div>
        <Questionnaire
          onEmailSending={setEmailSending}
          onEmailSent={setEmailSent}
          onForm={setForm}
        />
      </Portal>
    </>
  );
}
