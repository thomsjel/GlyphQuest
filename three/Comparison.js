import { MSDFTextGeometry, MSDFTextMaterial } from "three-msdf-text-utils";
import * as THREE from "three";
import { Text } from "troika-three-text";
import { POSITIONS } from "./constants/glyphQuest/index.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default class Comparison {
  constructor() {
    this.scene = new THREE.Scene();

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.01,
      100
    );
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.camera.position.z = 0.5;
    this.controls.update();

    const ambientLight = new THREE.AmbientLight(0x404040, 1); // soft white light
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5).normalize();
    this.scene.add(directionalLight);

    this.animate();

    window.addEventListener("resize", this.onWindowResize.bind(this), false);

    this.setup();
  }

  setup() {
    this.showMSDF().then((stationA) => {
      this.scene.add(stationA);
    });

    const stationB = this.showSDF();
    this.scene.add(stationB);
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));

    if (this.controls) {
      this.controls.update();
    }

    // Rendering der Szene
    this.renderer.render(this.scene, this.camera);
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  showMSDF() {
    return new Promise((resolve, reject) => {
      Promise.all([
        this.loadFontAtlas("/fonts/Arial.png"),
        this.loadFont("/fonts/Arial-msdf.json"),
      ])
        .then(([atlas, font]) => {
          const msdfTextGeometry = new MSDFTextGeometry({
            text: `A`,
            font: font.data,
          });

          const msdfTextMaterial = new MSDFTextMaterial();
          msdfTextMaterial.uniforms.uMap.value = atlas;
          msdfTextMaterial.side = THREE.DoubleSide;
          msdfTextMaterial.uniforms.uColor.value = new THREE.Color(0xffffff);

          const msdfTextMesh = new THREE.Mesh(
            msdfTextGeometry,
            msdfTextMaterial
          );
          msdfTextMesh.scale.set(0.016, 0.016, 0.016);
          msdfTextMesh.rotation.y = Math.PI;
          msdfTextMesh.rotation.z = Math.PI;
          msdfTextMesh.position.set(-0.5, -0.145, 0);
          resolve(msdfTextMesh);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  showSDF() {
    const sdfText = new Text();
    sdfText.text = `A`;
    sdfText.font = "/fonts/Arial.ttf";
    sdfText.fontSize = 0.7; // Schriftgröße anpassen
    sdfText.color = 0xffffff;
    sdfText.overflowWrap = "break-word";
    sdfText.anchorX = "center";
    sdfText.anchorY = "middle";
    sdfText.textAlign = "center";

    sdfText.sync();

    sdfText.position.set(0.25, POSITIONS.INIT.y, 0);

    return sdfText;
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
}
