import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default class Intro {
  constructor() {
    window.addEventListener("resize", this.onWindowResize.bind(this), false);
    this.init();
    this.animate();
  }

  init() {
    this.container = document.getElementById("intro");
    document.body.appendChild(this.container);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.01,
      1000
    );

    this.light = new THREE.PointLight(0xffffff, 120);
    this.light.position.set(2, 1, 5);
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(this.light, this.ambientLight);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    this.camera.position.set(0, 0, 5);
    this.controls.update();

    this.container.appendChild(this.renderer.domElement);

    this.loadModels();
  }

  loadModels() {
    const loader = new GLTFLoader();
    loader.load(
      "/models/GlyphQuestLogo5.glb",
      (gltf) => {
        this.glyphQuestLogo = gltf.scene;
        this.glyphQuestLogo.scale.set(0.5, 0.5, 0.5);
        this.glyphQuestLogo.position.set(0, 0, 0);
        this.scene.add(this.glyphQuestLogo);

        this.animate();
      },
      undefined,
      function (error) {
        console.error(error);
      }
    );
  }

  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.renderer.render(this.scene, this.camera);
    this.controls.update();
  }

  onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
