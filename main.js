console.log("🚀 Script started!");

// Global variables for simulation speed and planet size factor
let simulationSpeed = 1;
let planetSizeFactor = 1;

// Global variable for follow mode (null means no follow target)
let followTarget = null;
let followOffset = new THREE.Vector3(); // Offset from target to camera

// Global variables for label display
let alwaysShowNames = false;
let nameMode = "all"; // Options: "all", "planet", "moon"

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.TextureLoader().load('assets/stars_milky_way.jpg'); // Space background

// Camera Setup
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 3000);
camera.position.set(0, -300, 150);

// Renderer Setup
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Camera Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.enableZoom = true;
controls.addEventListener('change', () => {
  if (followTarget) {
    followOffset.copy(camera.position).sub(followTarget.position);
  }
});

// Listen for Escape key to exit follow mode
document.addEventListener('keydown', (event) => {
  if (event.key === "Escape") {
    followTarget = null;
  }
});

// Lighting
const light = new THREE.PointLight(0xffffff, 2, 3000);
scene.add(light);

// --- External Light ---
// Create an external directional light for overall illumination.
// It is initially off.
let externalLightEnabled = false;
let externalLightIntensity = 1.0;
const externalLight = new THREE.DirectionalLight(0xffffff, externalLightIntensity);
externalLight.position.set(100, 100, 100);
scene.add(externalLight);
externalLight.visible = externalLightEnabled;

// Texture Loader
const textureLoader = new THREE.TextureLoader();

// Sun
const sunGeometry = new THREE.SphereGeometry(20, 64, 64);
const sunTexture = textureLoader.load('assets/sun.jpg');
const sunMaterial = new THREE.MeshBasicMaterial({ map: sunTexture });
const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
sunMesh.position.set(0, 0, 0);
sunMesh.userData = {
  name: "Sun",
  size: "1,392,700 km",
  temperature: "5505°C",
  distance: "0 km",
  selfRotationSpeed: 0.001,
  type: "sun"
};
scene.add(sunMesh);

// Raycaster for Hover/Click Detection
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let hoveredObject = null;

// Planet Data
const planets = [
  { name: "Mercury", radius: 5, distance: 40, speed: 4.15, texture: "mercury.jpg", temperature: "167°C", size: "4,879 km", selfRotationSpeed: 0.005, moons: [] },
  { name: "Venus", radius: 9, distance: 70, speed: 1.62, texture: "venus.jpg", temperature: "464°C", size: "12,104 km", selfRotationSpeed: 0.002, moons: [] },
  { name: "Earth", radius: 10, distance: 100, speed: 1, texture: "earth.jpg", temperature: "15°C", size: "12,742 km", selfRotationSpeed: 0.02, moons: [
      { name: "Moon", radius: 2.7, distance: 15, speed: 2.5, texture: "moon.jpg", temperature: "−20°C", size: "3,474 km" }
    ] },
  { name: "Mars", radius: 7, distance: 150, speed: 0.53, texture: "mars.jpg", temperature: "−60°C", size: "6,779 km", selfRotationSpeed: 0.018, moons: [
      { name: "Phobos", radius: 1.5, distance: 7, speed: 4.0, temperature: "−40°C", size: "22 km" },
      { name: "Deimos", radius: 1, distance: 12, speed: 3.5, temperature: "−40°C", size: "12 km" }
    ] },
  { name: "Jupiter", radius: 18, distance: 250, speed: 0.08, texture: "jupiter.jpg", temperature: "−108°C", size: "139,820 km", selfRotationSpeed: 0.04, moons: [
      { name: "Io", radius: 3, distance: 25, speed: 1.8, temperature: "110°C", size: "3,643 km" },
      { name: "Europa", radius: 2.5, distance: 30, speed: 1.3, temperature: "−160°C", size: "3,121 km" }
    ] },
  { 
    name: "Saturn", 
    radius: 15, 
    distance: 400, 
    speed: 0.03, 
    texture: "saturn.jpg", 
    temperature: "−139°C", 
    size: "116,460 km", 
    selfRotationSpeed: 0.03, 
    moons: [
      { name: "Titan", radius: 4, distance: 35, speed: 1.1, temperature: "−179°C", size: "5,151 km" }
    ] 
  },
  { name: "Uranus", radius: 12, distance: 600, speed: 0.01, texture: "uranus.jpg", temperature: "−195°C", size: "50,724 km", selfRotationSpeed: 0.025, moons: [
      { name: "Titania", radius: 2, distance: 20, speed: 0.8, temperature: "−200°C", size: "1,578 km" }
    ] },
  { name: "Neptune", radius: 11, distance: 800, speed: 0.006, texture: "neptune.jpg", temperature: "−200°C", size: "49,244 km", selfRotationSpeed: 0.03, moons: [
      { name: "Triton", radius: 2.5, distance: 15, speed: 0.7, temperature: "−235°C", size: "2,706 km" }
    ] },
  { name: "Pluto", radius: 4, distance: 1000, speed: 0.002, texture: "mercury.jpg", temperature: "−225°C", size: "2,376 km", selfRotationSpeed: 0.01, moons: [
      { name: "Charon", radius: 1.5, distance: 10, speed: 0.5, temperature: "−210°C", size: "1,212 km" }
    ] }
];

const planetMeshes = [];
const moonMeshes = [];

/**
 * Creates a visible orbit line for reference
 */
function createOrbit(distance) {
  const orbitCurve = new THREE.EllipseCurve(0, 0, distance, distance);
  const orbitPoints = orbitCurve.getPoints(200);
  const orbitGeometry = new THREE.BufferGeometry().setFromPoints(
    orbitPoints.map(p => new THREE.Vector3(p.x, 0, p.y))
  );
  const orbitMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
  const orbitLine = new THREE.Line(orbitGeometry, orbitMaterial);
  scene.add(orbitLine);
}

// Create Planets & Moons
planets.forEach(planet => {
  console.log(`🌍 Creating planet: ${planet.name}`);
  
  // Main planet
  const planetTexture = textureLoader.load(`assets/${planet.texture}`);
  const planetMaterial = new THREE.MeshStandardMaterial({ map: planetTexture });
  const planetGeometry = new THREE.SphereGeometry(planet.radius, 64, 64);
  const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
  planetMesh.userData = {
    name: planet.name,
    size: planet.size,
    temperature: planet.temperature,
    distance: `${planet.distance} million km`,
    selfRotationSpeed: planet.selfRotationSpeed,
    type: "planet"
  };
  scene.add(planetMesh);

  createOrbit(planet.distance);

  planetMeshes.push({
    mesh: planetMesh,
    distance: planet.distance,
    speed: planet.speed,
    angle: Math.random() * Math.PI * 2,
    selfRotationSpeed: planet.selfRotationSpeed
  });

  // If this planet is Saturn, add an atmosphere layer and rings
  if (planet.name === "Saturn") {
    // Gaseous atmosphere layer
    const atmosphereGeometry = new THREE.SphereGeometry(planet.radius * 1.05, 64, 64);
    // Optional custom gas texture, e.g. "saturn_atmosphere.png"
    const atmosphereTexture = textureLoader.load('assets/saturn_atmosphere.png');
    const atmosphereMaterial = new THREE.MeshStandardMaterial({
      map: atmosphereTexture,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(0x222222)
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
    // Make the atmosphere a child of the planet so it follows planet movement
    planetMesh.add(atmosphereMesh);
    // Position at the planet's center
    atmosphereMesh.position.set(0, 0, 0);

    // Saturn rings
    const innerRingRadius = planet.radius * 1.2;
    const outerRingRadius = planet.radius * 2.0;
    const ringGeometry = new THREE.RingGeometry(innerRingRadius, outerRingRadius, 64);
    const ringTexture = textureLoader.load('assets/saturn_rings.jpg');
    const ringMaterial = new THREE.MeshBasicMaterial({
      map: ringTexture,
      side: THREE.DoubleSide,
      transparent: true
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    // Rotate ring to align with Saturn's equatorial plane
    ringMesh.rotation.x = Math.PI / 2;
    // Make the ring a child of the planet
    planetMesh.add(ringMesh);
    ringMesh.position.set(0, 0, 0);
  }

  // Create Moons (if any)
  planet.moons.forEach(moon => {
    let moonMaterial;
    if (moon.texture) {
      const moonTexture = textureLoader.load(`assets/${moon.texture}`);
      moonMaterial = new THREE.MeshStandardMaterial({ map: moonTexture });
    } else {
      moonMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    }
    const moonGeometry = new THREE.SphereGeometry(moon.radius, 32, 32);
    const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);
    moonMesh.userData = {
      name: moon.name,
      size: moon.size || "",
      temperature: moon.temperature || "",
      distance: `${moon.distance} million km`,
      type: "moon"
    };
    scene.add(moonMesh);

    moonMeshes.push({
      mesh: moonMesh,
      parent: planetMesh,
      distance: moon.distance,
      speed: moon.speed,
      angle: Math.random() * Math.PI * 2
    });
  });
});

// Create Asteroid Belt
const asteroidBeltGroup = new THREE.Group();
scene.add(asteroidBeltGroup);
const asteroids = [];

function createAsteroidBelt() {
  const numAsteroids = 300;
  // Adjusted radii to move the belt farther away from Mars & Jupiter
  const innerRadius = 180;
  const outerRadius = 240;
  const rockTexture = textureLoader.load('assets/rock.jpg');
  
  for (let i = 0; i < numAsteroids; i++) {
    // Create a rough asteroid from a low-poly sphere
    const baseRadius = THREE.MathUtils.randFloat(0.2, 0.7);
    const geometry = new THREE.SphereGeometry(baseRadius, 8, 8);
    // Perturb vertices to break up the smooth look
    const positionAttribute = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    for (let j = 0; j < positionAttribute.count; j++) {
      vertex.fromBufferAttribute(positionAttribute, j);
      vertex.x += THREE.MathUtils.randFloatSpread(0.4);
      vertex.y += THREE.MathUtils.randFloatSpread(0.4);
      vertex.z += THREE.MathUtils.randFloatSpread(0.4);
      positionAttribute.setXYZ(j, vertex.x, vertex.y, vertex.z);
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({ map: rockTexture });
    const asteroid = new THREE.Mesh(geometry, material);
    // Random orbital distance and starting angle
    const r = THREE.MathUtils.randFloat(innerRadius, outerRadius);
    const theta = THREE.MathUtils.randFloat(0, Math.PI * 2);
    asteroid.position.x = r * Math.cos(theta);
    asteroid.position.z = r * Math.sin(theta);
    asteroid.position.y = THREE.MathUtils.randFloat(-2, 2); // slight vertical displacement
    asteroid.userData = {
      name: "Asteroid",
      type: "asteroid",
      distance: r,
      angle: theta,
      speed: THREE.MathUtils.randFloat(0.0005, 0.002)
    };
    asteroidBeltGroup.add(asteroid);
    asteroids.push(asteroid);
  }
}
createAsteroidBelt();

// Clock
const clockDiv = document.getElementById("clock");
const clockToggle = document.getElementById("clockToggle");
clockToggle.addEventListener("change", () => {
  clockDiv.style.display = clockToggle.checked ? "block" : "none";
});

// UI Controls for Info Labels
document.getElementById("alwaysShowNames").addEventListener("change", (e) => {
  alwaysShowNames = e.target.checked;
  if (!alwaysShowNames) {
    hideAllLabels();
  }
});

document.getElementById("nameMode").addEventListener("change", (e) => {
  nameMode = e.target.value;
});

// --- UI Controls for External Light ---
document.getElementById("externalLightToggle").addEventListener("change", (e) => {
  externalLightEnabled = e.target.checked;
  externalLight.visible = externalLightEnabled;
});
document.getElementById("externalLightIntensity").addEventListener("input", (e) => {
  externalLightIntensity = parseFloat(e.target.value);
  externalLight.intensity = externalLightIntensity;
  document.getElementById("externalLightIntensityValue").innerText = externalLightIntensity.toFixed(1);
});

// Function to create a label element for an object (if not already created)
function createLabel(mesh) {
  if (!mesh.userData.labelElement) {
    const label = document.createElement("div");
    label.className = "objectLabel";
    // Basic inline styling; you can move this to your CSS if desired.
    label.style.position = "absolute";
    label.style.color = "white";
    label.style.fontSize = "12px";
    label.style.pointerEvents = "none";
    label.style.textShadow = "0 0 5px black";
    label.innerText = mesh.userData.name;
    document.body.appendChild(label);
    mesh.userData.labelElement = label;
  }
  return mesh.userData.labelElement;
}

// Update labels for all objects that qualify based on nameMode
function updateLabels() {
  // Update planet labels
  planetMeshes.forEach(item => {
    if (alwaysShowNames && (nameMode === "all" || nameMode === "planet")) {
      const label = createLabel(item.mesh);
      label.style.display = "block";
      updateLabelPosition(item.mesh, label);
    } else if (item.mesh.userData.labelElement) {
      item.mesh.userData.labelElement.style.display = "none";
    }
  });
  // Update moon labels
  moonMeshes.forEach(item => {
    if (alwaysShowNames && (nameMode === "all" || nameMode === "moon")) {
      const label = createLabel(item.mesh);
      label.style.display = "block";
      updateLabelPosition(item.mesh, label);
    } else if (item.mesh.userData.labelElement) {
      item.mesh.userData.labelElement.style.display = "none";
    }
  });
}

// Update a single label's screen position based on the object's position
function updateLabelPosition(mesh, label) {
  const vector = mesh.position.clone();
  vector.project(camera);
  const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
  const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
  label.style.left = `${x}px`;
  label.style.top = `${y}px`;
}

// Hide all labels (called when alwaysShowNames is turned off)
function hideAllLabels() {
  planetMeshes.forEach(item => {
    if (item.mesh.userData.labelElement) {
      item.mesh.userData.labelElement.style.display = "none";
    }
  });
  moonMeshes.forEach(item => {
    if (item.mesh.userData.labelElement) {
      item.mesh.userData.labelElement.style.display = "none";
    }
  });
}

// Animation Loop
function animate() {
  requestAnimationFrame(animate);

  // Earth-based clock
  const earthData = planetMeshes.find(p => p.mesh.userData.name === "Earth");
  if (earthData) {
    const totalDays = earthData.mesh.rotation.y / (2 * Math.PI);
    const wholeDays = Math.floor(totalDays);
    const fractionalDay = totalDays - wholeDays;
    const hours = Math.floor(fractionalDay * 24);
    const minutes = Math.floor(((fractionalDay * 24) - hours) * 60);
    const totalYears = earthData.angle / (2 * Math.PI);
    const wholeYears = Math.floor(totalYears);

    clockDiv.innerText =
      `Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}, ` +
      `${wholeDays} days, ${wholeYears} years`;
  }

  // Update planet positions and rotations
  planetMeshes.forEach(planet => {
    planet.angle += (planet.speed * simulationSpeed * 0.001);
    planet.mesh.position.x = planet.distance * Math.cos(planet.angle);
    planet.mesh.position.z = planet.distance * Math.sin(planet.angle);
    planet.mesh.rotation.y += planet.selfRotationSpeed * simulationSpeed;
  });

  // Rotate Sun
  sunMesh.rotation.y += sunMesh.userData.selfRotationSpeed * simulationSpeed;

  // Update moon positions
  moonMeshes.forEach(moon => {
    moon.angle += (moon.speed * simulationSpeed * 0.002);
    const parentPos = moon.parent.position;
    moon.mesh.position.x = parentPos.x + moon.distance * Math.cos(moon.angle);
    moon.mesh.position.z = parentPos.z + moon.distance * Math.sin(moon.angle);
  });

  // Update asteroid belt: update each asteroid's orbital position
  asteroids.forEach(asteroid => {
    asteroid.userData.angle += asteroid.userData.speed * simulationSpeed;
    const r = asteroid.userData.distance;
    asteroid.position.x = r * Math.cos(asteroid.userData.angle);
    asteroid.position.z = r * Math.sin(asteroid.userData.angle);
  });

  // Follow mode camera update
  if (followTarget) {
    const desiredPos = followTarget.position.clone().add(followOffset);
    camera.position.lerp(desiredPos, 0.1);
    controls.target.lerp(followTarget.position, 0.1);
  }

  controls.update();
  renderer.render(scene, camera);

  // Update labels if alwaysShowNames is enabled
  if (alwaysShowNames) {
    updateLabels();
  }
}
animate();

// Hover Detection
document.addEventListener("mousemove", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children);

  if (intersects.length > 0) {
    const obj = intersects[0].object;
    if (hoveredObject !== obj && obj.userData.name) {
      hoveredObject = obj;
      showInfo(obj.userData, event.clientX, event.clientY);
    }
  } else {
    hoveredObject = null;
    hideInfo();
  }
});

// Click: Follow Mode
document.addEventListener("click", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(scene.children);

  if (intersects.length > 0) {
    const obj = intersects[0].object;
    if (obj.userData.name) {
      if (followTarget === obj) {
        followTarget = null;
      } else {
        followTarget = obj;
        followOffset.copy(camera.position).sub(followTarget.position);
      }
    }
  }
});

// Info Panel (for hover only)
function showInfo(data, x, y) {
  const infoPanel = document.getElementById("infoPanel");
  infoPanel.classList.add("visible");
  infoPanel.style.left = `${x + 10}px`;
  infoPanel.style.top = `${y + 10}px`;
  document.getElementById("planetName").innerText = data.name;
  document.getElementById("planetSize").innerText = data.size || "N/A";
  document.getElementById("planetTemp").innerText = data.temperature || "N/A";
  document.getElementById("planetDistance").innerText = data.distance || "N/A";
}

function hideInfo() {
  document.getElementById("infoPanel").classList.remove("visible");
}

// UI Controls for simulation parameters
document.getElementById('speedSlider').addEventListener('input', (event) => {
  simulationSpeed = parseFloat(event.target.value);
  document.getElementById('speedValue').innerText = simulationSpeed.toFixed(1);
});

document.getElementById('zoomSlider').addEventListener('input', (event) => {
  let zoomValue = parseFloat(event.target.value);
  if (!followTarget) {
    camera.position.set(0, -zoomValue * 3, zoomValue * 1.5);
  }
  document.getElementById('zoomValue').innerText = zoomValue;
});

document.getElementById('sizeSlider').addEventListener('input', (event) => {
  planetSizeFactor = parseFloat(event.target.value);
  document.getElementById('sizeValue').innerText = planetSizeFactor.toFixed(1);
  planetMeshes.forEach(p => {
    p.mesh.scale.set(planetSizeFactor, planetSizeFactor, planetSizeFactor);
  });
});

// Toggle Panel & Subsections
function togglePanel() {
  const panel = document.getElementById("paramPanel");
  panel.classList.toggle("collapsed");
}

function toggleSubsection(header) {
  const subsection = header.nextElementSibling;
  const arrow = header.querySelector(".subArrow");
  if (subsection.style.display === "none") {
    subsection.style.display = "block";
    arrow.innerHTML = "&#10095;";
  } else {
    subsection.style.display = "none";
    arrow.innerHTML = "&#10094;";
  }
}
