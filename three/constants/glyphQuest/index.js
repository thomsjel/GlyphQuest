import * as THREE from "three";

export const COLOR = {
  INDIGO: 0x818cf8,
  GREEN: 0x00ff00,
  PINKY: 0xff0060,
};

export const TEXTS = {
  STATION_ONE:
    "Gutenberg druckte in Mainz das erste Buch mit beweglichen Bleilettern und löste damit eine Medienrevolution aus.",
  STATION_TWO:
    "Ligaturen sind Buchstabenverbindungen, um Leerräume oder Überschneidungen mit nebenstehenden Buchstaben zu vermeiden.",
  STATION_THREE: "Station 3",
  STATION_FOUR: "Station 4",
  STATION_FIVE: "Station 5",
};

const customModelMaterial = new THREE.MeshStandardMaterial({
  color: new THREE.Color(COLOR.PINKY),
  metalness: 0,
  roughness: 0,
});

const radiusMaterial = new THREE.MeshBasicMaterial({
  color: COLOR.INDIGO,
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.8,
});

export const MATERIALS = {
  CUSTOM_MODEL: customModelMaterial,
  BOUNDARY: radiusMaterial,
};
