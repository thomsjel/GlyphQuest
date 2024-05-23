"use client";

import Head from "next/head";
import Image from "next/image";
import { Inter, Work_Sans } from "next/font/google";
import styles from "@/styles/Home.module.css";
import Link from "next/link";
import DisplayScreenshotCard from "@/components/DisplayScreenshotCard";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { ArcballControls } from "three/addons/controls/ArcballControls.js";

export default function Home() {
  const sceneRef = useRef();
  const [controlsEnabled, setControlsEnabled] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const glyphQuestLogoRef = useRef();

  useEffect(() => {
    if (sceneRef.current) {
      return;
    }
    /*const video = document.getElementById("intro-video");
    const text = document.getElementById("text");

    video.addEventListener("timeupdate", function () {
      if (video.currentTime >= 5.7) {
        video.pause();
        //text.textContent = `${video.currentTime}`;
        //show start button
      }
    });*/

    let container, scene, camera, renderer, controls;
    let mixer, animation;
    let glyphQuestLogo;
    let isDragging = false;
    let previousMousePosition = {
      x: 0,
      y: 0,
    };

    const clock = new THREE.Clock();

    const init = () => {
      container = document.createElement("div");
      container.id = "custom-canvas";
      document.body.appendChild(container);

      scene = new THREE.Scene();
      sceneRef.current = scene;

      camera = new THREE.PerspectiveCamera(
        70,
        window.innerWidth / window.innerHeight,
        0.01,
        1000
      );
      camera.position.set(0, 0, 7);

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setSize(window.innerWidth, window.innerHeight);

      container.appendChild(renderer.domElement);

      const light = new THREE.PointLight(0xffffff, 120);
      light.position.set(2, 1, 5);
      const light2 = new THREE.PointLight(0xffffff, 50);
      light2.position.set(0, 1, 7);
      const light3 = new THREE.RectAreaLight(0xffffff, 100, 10, 10);
      light3.position.set(0, 1, -7);
      scene.add(light, light2, light3);

      //load gltfs
      const loader = new GLTFLoader();

      loader.load("/models/GlyphQuestLogo3.glb", (gltf) => {
        glyphQuestLogo = gltf.scene;
        glyphQuestLogo.customAttribute = "model";
        // glyphQuestLogo.scale.set(2, 2, 2);
        scene.add(glyphQuestLogo);
        glyphQuestLogoRef.current = glyphQuestLogo.children[0];
        glyphQuestLogoRef.current.position.set(0, 0, 0);
        //glyphQuestLogo.children[0].rot

        console.log("GLTF: ", glyphQuestLogoRef.current);

        animation = gltf.animations[0];

        mixer = new THREE.AnimationMixer(glyphQuestLogo);
        mixer.clipAction(animation).play();
      });

      controls = new ArcballControls(camera, renderer.domElement);
      controls.addEventListener("change", () => renderer.render(scene, camera));

      window.addEventListener("resize", onWindowResize);
    };

    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clock.getDelta();
      if (clock.elapsedTime >= 5 && mixer && animation) {
        mixer.clipAction(animation).paused = true;
        setControlsEnabled(true);
      }

      if (mixer) {
        mixer.update(delta);
      }

      controls.update();

      render();
    };

    const render = (timestamp, frame) => {
      renderer.render(scene, camera);
    };

    const onWindowResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    init();
    animate();

    return () => {
      /*document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);*/
    };
  }, []);

  const handleRenderCanvas = () => {
    document.getElementById("custom-canvas").remove();
  };

  return (
    <>
      <Head>
        <title>GlyphQuest GO 🚀</title>
        <meta
          name="description"
          content="GlyphQuest ist eine AR-App, welche die Lesbarkeit von 3D-Text in der augmentieren Realität erforscht. Spieler:innen navigieren durch reale Umgebungen, um räumlich angezeigte Glyphen zu entschlüsseln, die sie von einem Ziel zum nächsten führen. Das Spiel bietet ein immersives Erlebnis, das digitale Inhalte mit der physischen Welt verschmelzen lässt und gleichzeitig Daten sammelt, um die Technologien für räumlichen Text in AR zu verbessern."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={`${styles.main}`}>
        <div className={styles.center}>
          {/*<Image
            className={styles.logo}
            src="/next.svg"
            alt="Next.js Logo"
            width={180}
            height={37}
            priority
  />*/}
        </div>
        <div>
          {/*<img width={200} height={200} src={image} alt="Screenshot" />*/}
          {/*<img id="compass" src="/compass.png" alt="compass" />*/}
          {/*<div id="heading">0°</div>*/}
        </div>
        <div className={styles.play}>
          {controlsEnabled && (
            <Link
              href="/test"
              className={styles.card}
              onClick={handleRenderCanvas}
            >
              <div id="headline">
                <h2 className="headline render-in-front">
                  <span>Glyph</span>
                  <span>Quest</span>
                </h2>
              </div>
            </Link>
          )}
        </div>

        <DisplayScreenshotCard />
      </main>
    </>
  );
}
