import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { Text } from "troika-three-text";

const options = {
  enableSwoopingCamera: false,
  enableRotation: false,
  color: 0xffffff,
  metalness: 0,
  roughness: 0.9,
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

export const onWindowResize = (camera, renderer) => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
};

export const getUserLocation = () => {
  return new Promise((resolve, reject) => {
    if ("geolocation" in navigator) {
      const options = {
        enableHighAccuracy: true, // Request high accuracy location
        timeout: 10000, // Maximum time in milliseconds to wait for a response
        maximumAge: 0, // Maximum age of a cached location that is acceptable to return, 0 means always try to get a fresh location
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            long: position.coords.longitude,
          });
        },
        (error) => {
          reject(error);
        },
        options
      );
    } else {
      reject(new Error("Geolocation is not supported by this browser."));
    }
  });
};

export const getRealTimePosition = () => {
  if ("geolocation" in navigator) {
    // Geolocation is available
    navigator.geolocation.watchPosition(
      (position) => {
        //instructions.innerHTML = `Lat: ${position.coords.latitude} <br> lon: ${position.coords.longitude} <br>`;
      },
      (error) => {
        console.error("Error occurred: ", error.message);
      },
      {
        enableHighAccuracy: true, // Provides more accurate results when true
        maximumAge: 0, // Maximum age in milliseconds of a possible cached position that's acceptable to return
        timeout: 5000, // Maximum time in milliseconds that the device is allowed to take in order to return a position
      }
    );
  } else {
    // Geolocation is not supported
    console.log("Geolocation is not supported by your browser");
  }

  // To stop watching the position
  // navigator.geolocation.clearWatch(watchID);
};

export const deviceMotion = (camera) => {
  if (
    typeof DeviceMotionEvent !== "undefined" &&
    typeof DeviceMotionEvent.requestPermission === "function"
  ) {
    // (optional) Do something before API request prompt.
    DeviceMotionEvent.requestPermission()
      .then((response) => {
        // (optional) Do something after API prompt dismissed.
        if (response == "granted") {
          window.addEventListener("devicemotion", (e) => {
            // Access device motion data
            const acceleration = e.acceleration;
            const rotationRate = e.rotationRate;
            // Example: Log acceleration data
            console.log(
              `Acceleration X: ${acceleration.x}, Y: ${acceleration.y}, Z: ${acceleration.z}`
            );
            console.log(
              `Rotation Rate: beta ${rotationRate.beta}, gamma ${rotationRate.gamma}`
            );
          });

          // Additionally, listen for device orientation changes
          window.addEventListener("deviceorientation", (event) => {
            const { alpha, beta, gamma } = event;
            updateDeviceOrientation(alpha, beta, gamma, camera);
          });
        }
      })
      .catch(console.error);
  } else {
    alert("DeviceMotionEvent is not defined");
  }
};

const updateDeviceOrientation = (alpha, beta, gamma, camera) => {
  // Convert degrees to radians and adjust the scene or camera accordingly
  const alphaRadians = THREE.MathUtils.degToRad(alpha);
  const betaRadians = THREE.MathUtils.degToRad(beta);
  const gammaRadians = THREE.MathUtils.degToRad(gamma);

  // Assuming you have a reference to your Three.js camera
  camera.rotation.set(betaRadians, alphaRadians, -gammaRadians, "YXZ"); // The 'YXZ' order might vary based on your setup
};

// Convert GPS location to Three.js coordinates
export const gpsToThreejs = (
  userLat,
  userLon,
  targetLat,
  targetLon,
  scale = 1
) => {
  // Earth's radius in meters
  const R = 6378137;
  const dLat = THREE.MathUtils.degToRad(targetLat - userLat);
  const dLon = THREE.MathUtils.degToRad(targetLon - userLon);
  const lat1 = THREE.MathUtils.degToRad(userLat);

  const x = dLon * Math.cos(lat1) * R;
  const z = -dLat * R; // Negate dLat to make positive z-axis point towards geographical north

  // Apply scale if your Three.js units are different from meters
  return { x: x * scale, z: z * scale };
};

export const placeVirtualObject = async (
  object,
  targetLat,
  targetLong,
  offsetDistance = 1,
  scene,
  userFacingDirection
) => {
  try {
    const userLocation = await getUserLocation();
    const scale = 1; // Define your scale, assuming 1 unit = 1 meter for simplicity

    // Assuming gpsToThreejs function is defined as previously discussed
    const objectPosition = gpsToThreejs(
      userLocation.lat,
      userLocation.long,
      targetLat,
      targetLong
    );

    //directionElement.innerHTML = `userDirection: ${userFacingDirection}`;
    // Calculate offset based on userFacingDirection
    const radians = userFacingDirection * (Math.PI / 180);
    const offsetX = Math.sin(radians) * offsetDistance;
    const offsetZ = Math.cos(radians) * offsetDistance;

    // Adjust object position with the calculated offset
    objectPosition.x += offsetX * scale; // Apply scale if necessary
    objectPosition.z += offsetZ * scale; // Apply scale if necessary

    object.position.set(objectPosition.x, 0, objectPosition.z);
    scene.add(object);
  } catch (error) {
    console.error("Error getting user's location or placing object:", error);
  }
};

export const addQuestOne = (renderTarget, camera, scene) => {
  const textureLoader = new THREE.TextureLoader();

  const hdrEquirect = new RGBELoader().load(
    "/empty_warehouse_01_2k.hdr",
    () => {
      hdrEquirect.mapping = THREE.EquirectangularReflectionMapping;
    }
  );

  const normalMapTexture = textureLoader.load("/normal3.jpg");
  normalMapTexture.wrapS = THREE.RepeatWrapping;
  normalMapTexture.wrapT = THREE.RepeatWrapping;
  normalMapTexture.repeat.set(options.normalRepeat, options.normalRepeat);

  const glass = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    metalness: options.metalness,
    roughness: options.roughness,
    transmission: options.transmission,
    ior: options.ior,
    reflectivity: options.reflectivity,
    thickness: options.thickness,
    //envMap: hdrEquirect,
    //envMapIntensity: options.envMapIntensity,
    //clearcoat: options.clearcoat,
    //clearcoatRoughness: options.clearcoatRoughness,
    normalScale: new THREE.Vector2(options.normalScale),
    normalMap: normalMapTexture,
    //clearcoatNormalMap: normalMapTexture,
    //clearcoatNormalScale: new THREE.Vector2(options.clearcoatNormalScale),
    //side: THREE.DoubleSide,
  });

  const plane = new THREE.PlaneGeometry(0.6, 1);
  const box = new THREE.BoxGeometry(0.6, 1, 0.02);
  const material = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(0xffffff) },
      opacity: { value: 0.5 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    vertexShader: `
        void main() {
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
    fragmentShader: `
        #define M_PI 3.1415926535897932384626433832795
        uniform vec3 color;
       uniform float opacity;
        void main() {
          gl_FragColor = vec4(color.xyz, opacity);
        }`,
  });

  const planeMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.7,
    color: 0x000000,
  });

  const mesh = new THREE.Mesh(plane, material);
  mesh.quaternion.copy(camera.quaternion);
  mesh.position
    .copy(camera.position)
    .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1));

  scene.add(mesh);

  const g = new THREE.BoxGeometry(1, 1);
  const m = new THREE.MeshStandardMaterial({ color: "red" });
  const cube = new THREE.Mesh(g, m);
  cube.position
    .copy(camera.position)
    .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1));
  cube.position.z = -1;
  //cube.rotation.set(1, 2, 3);
  //scene.add(cube);

  // Create:
  const myText = new Text();
  scene.add(myText);

  // Set properties to configure:
  myText.text = `This is a billboard \n with text`;
  myText.fontSize = 0.2;
  myText.position
    .copy(camera.position)
    .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(1));
  myText.position.z += 0.002;
  myText.color = 0xff0000;

  // Update the rendering:
  myText.sync();
};

// Custom vertex shader
const customVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;

void main() {
    vNormal = normal;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// Custom fragment shader
const customFragmentShader = `
varying vec3 vNormal;
varying vec3 vPosition;

uniform vec3 intersectionPoint;

void main() {
    // Calculate the vector from the boundary's position to the intersection point
    vec3 toIntersection = intersectionPoint - vPosition;
    
    // Calculate the distance from the boundary's position to the intersection point
    float distance = length(toIntersection);
    
    // Set the maximum distance where light starts to fade
    float maxDistance = 0.01;
    
    // Calculate brightness based on distance
    float brightness = 1.0 - min(distance / maxDistance, 1.0);
    
    // Apply brightness to the color
    vec3 color = vec3(1.0, 0.0, 0.0); // Red color for the boundary
    color *= brightness;
    
    // Output the final color
    gl_FragColor = vec4(color, 1.0);
}
`;

// Create a custom material using the custom shaders
const customMaterial = new THREE.ShaderMaterial({
  vertexShader: customVertexShader,
  fragmentShader: customFragmentShader,
  transparent: true,
  uniforms: {
    intersectionPoint: { value: new THREE.Vector3() }, // Initialize intersection point
  },
});

export const createBoundary = (object, radius, height, scene, boundaries) => {
  // Create a cylinder geometry
  const geometry = new THREE.CylinderGeometry(radius, radius, height, 16);
  // Create a material for the boundary (you can customize this)
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
  });
  // Create a mesh using the geometry and material
  const boundary = new THREE.Mesh(geometry, material);

  // Position the boundary based on the object's position
  boundary.position.copy(object.position);
  boundary.position.y = height / 2 - height / 8;

  console.log("BOUNDARY: ", boundary);

  // Add the boundary to the scene
  scene.add(boundary);

  // Store a reference to the object in the boundary for later use
  boundary.userData.object = object;

  // Push the boundary to the boundaries array
  boundaries.push(boundary);

  return boundary;
};

// Function to check camera intersection with boundaries
export const checkCameraIntersection = (camera, boundaries) => {
  for (const boundary of boundaries) {
    // Get the camera's position
    const cameraPosition = new THREE.Vector3();
    camera.getWorldPosition(cameraPosition);

    // console.log("BOUNDY;: ", boundary);
    // Get the distance between the camera and the boundary's position
    const distance = cameraPosition.distanceTo(boundary.position);

    // Check if the camera is inside the boundary
    if (distance < boundary.geometry.parameters.radiusTop) {
      // If the camera is inside the boundary, return information about the bounded object
      const object = boundary.userData.object;

      return object.userData; // Access custom attributes of the object
    }
  }
  console.log("NO INTERSECTION");
  // If camera is not inside any boundary, return null
  return null;
};

// Calculate intersection point between boundary and other geometry
function calculateIntersectionPoint(boundary, otherGeometry) {
  // Perform raycasting from boundary's position towards other geometry
  const raycaster = new THREE.Raycaster(
    boundary.position,
    otherGeometry.position.clone().sub(boundary.position).normalize()
  );
  const intersects = raycaster.intersectObject(otherGeometry);

  if (intersects.length > 0) {
    // Intersection found, update intersectionPoint uniform
    const intersectionPoint = intersects[0].point;
    boundary.material.uniforms.intersectionPoint.value.copy(intersectionPoint);
  } else {
    // No intersection, set intersectionPoint to a default value or disable the shader effect
    boundary.material.uniforms.intersectionPoint.value.set(0, 1, 0);
  }
}

// Update intersection point for each boundary
export const updateIntersectionPoints = (boundaries, otherGeometry) => {
  for (const boundary of boundaries) {
    // Update intersection point for each boundary with respect to the other geometry
    //console.log(boundary);
    calculateIntersectionPoint(boundary, otherGeometry);
  }
};
