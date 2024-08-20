import { MSDFTextGeometry, MSDFTextMaterial } from "three-msdf-text-utils";
import * as THREE from "three";
import { Text } from "troika-three-text";
import { POSITIONS } from "./constants/glyphQuest/index.js";
import { FontLoader } from "three/addons/loaders/FontLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export default class Billboards {
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
    this.createBlueBillboard().then((blueBillboard) => {
      this.scene.add(blueBillboard);
    });

    this.createBlackBillboard().then((blackBillboard) => {
      this.scene.add(blackBillboard);
    });
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

  createBlueBillboard() {
    return new Promise((resolve, reject) => {
      Promise.all([
        this.loadFontAtlas("/fonts/Arial-msdf-512.png"),
        this.loadFont("/fonts/Arial-msdf-512.json"),
      ])
        .then(([atlas, font]) => {
          const msdfTextGeometry = new MSDFTextGeometry({
            text: `Blauer Hintergrund\nohne Transparenz.`,
            font: font.data,
          });

          const msdfTextMaterial = new MSDFTextMaterial();
          msdfTextMaterial.uniforms.uMap.value = atlas;
          msdfTextMaterial.side = THREE.DoubleSide;

          const msdfTextMesh = new THREE.Mesh(
            msdfTextGeometry,
            msdfTextMaterial
          );
          msdfTextMesh.scale.set(0.0017, 0.0017, 0.0017);
          msdfTextMesh.rotation.y = Math.PI;
          msdfTextMesh.rotation.z = Math.PI;

          // Erstellen einer Billboard-Ebene für den Text
          const billboardGeometry = new THREE.PlaneGeometry(1.0, 0.6);
          const billboardMaterial = new THREE.MeshBasicMaterial({
            color: 0x0000ff,
            transparent: false,
          });
          const billboardMesh = new THREE.Mesh(
            billboardGeometry,
            billboardMaterial
          );

          billboardMesh.add(msdfTextMesh);
          msdfTextMesh.position.set(-0.4, -0.17, 0.01); // Text leicht vor die Billboard-Ebene setzen

          billboardMesh.position.set(
            POSITIONS.INIT.x - 0.6,
            POSITIONS.INIT.y,
            POSITIONS.INIT.z
          );
          billboardMesh.visible = true;

          resolve(billboardMesh);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  createBlackBillboard() {
    return new Promise((resolve, reject) => {
      Promise.all([
        this.loadFontAtlas("/fonts/Arial-msdf-512.png"),
        this.loadFont("/fonts/Arial-msdf-512.json"),
      ])
        .then(([atlas, font]) => {
          const msdfTextGeometry = new MSDFTextGeometry({
            text: `Schwarzer Hintergrund\nmit einer Transparenz\nvon 55%.`,
            font: font.data,
          });

          const msdfTextMaterial = new MSDFTextMaterial();
          msdfTextMaterial.uniforms.uMap.value = atlas;
          msdfTextMaterial.side = THREE.DoubleSide;

          const msdfTextMesh = new THREE.Mesh(
            msdfTextGeometry,
            msdfTextMaterial
          );
          msdfTextMesh.scale.set(0.0017, 0.0017, 0.0017);
          msdfTextMesh.rotation.y = Math.PI;
          msdfTextMesh.rotation.z = Math.PI;

          // Erstellen einer Billboard-Ebene für den Text
          const billboardGeometry = new THREE.PlaneGeometry(1.0, 0.6);
          const billboardMaterial = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.55,
          });
          const billboardMesh = new THREE.Mesh(
            billboardGeometry,
            billboardMaterial
          );

          billboardMesh.add(msdfTextMesh);
          msdfTextMesh.position.set(-0.4, -0.17, 0.01); // Text leicht vor die Billboard-Ebene setzen

          billboardMesh.position.set(
            POSITIONS.INIT.x + 0.6,
            POSITIONS.INIT.y,
            POSITIONS.INIT.z
          );
          billboardMesh.visible = true;

          resolve(billboardMesh);
        })
        .catch((error) => {
          reject(error);
        });
    });
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
