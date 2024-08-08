import * as THREE from "three";

export const COLOR = {
  INDIGO: 0x818cf8,
  GREEN: 0x00ff00,
  PINKY: 0xff0060,
  WHITE: 0xffffff,
};

export const TEXTS = {
  STATION_ONE: `Gutenberg druckte in \nMainz das erste Buch mit \nbeweglichen Bleilettern \nund löste damit eine \nMedienrevolution aus.`,
  STATION_TWO: `Ligaturen sind Buchstaben-\nverbindungen, um Leerräume\noder Überschneidungen mit\nnebenstehenden Buchstaben\nzu vermeiden.`,
  STATION_THREE: "Station 3",
  STATION_FOUR: `PAGINA`,
  STATION_FIVE: "Station 5",
};

const customModelMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(COLOR.PINKY),
  metalness: 0,
  roughness: 0,
});

const radiusMaterial = new THREE.MeshBasicMaterial({
  color: COLOR.INDIGO,
  transparent: true,
  opacity: 0.01,
});

const stationDMaterial = new THREE.MeshStandardMaterial({
  color: COLOR.INDIGO,
  metalness: 0,
  roughness: 0,
});

const reticleMaterial = new THREE.MeshBasicMaterial({
  color: COLOR.WHITE,
});

export const MATERIALS = {
  CUSTOM_MODEL: customModelMaterial,
  BOUNDARY: radiusMaterial,
  STATION_D: stationDMaterial,
  RETICLE: reticleMaterial,
};

export const POSITIONS = {
  STATION_A: new THREE.Vector3(-2.5, 0, -2),
  STATION_B: new THREE.Vector3(-2.5, 0, -7),
  STATION_C: new THREE.Vector3(2.5, 0, -2),
  STATION_D: new THREE.Vector3(2.5, 0, -7),
  STATION_E: new THREE.Vector3(0, 0, -12),
  INIT: new THREE.Vector3(0, 0, -2),
};
