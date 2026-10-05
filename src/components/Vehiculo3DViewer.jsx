import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RotateCw, Sun, Eye, Sparkles, X, Camera, Box, Info, Image, ZoomIn, ZoomOut, Check, ChevronLeft, ChevronRight } from "lucide-react";

// Fotografías reales en alta definición de la Honda CR-V 2014 Blanca (Taffeta White / Diamond White Pearl)
// Tomadas desde múltiples ángulos para el recorrido fotográfico 360° interactivo
export const FOTOS_REALES_CRV = [
  {
    id: "frontal-tres-cuartos",
    titulo: "Frontal 3/4",
    subtitulo: "Ángulo icónico de la Honda CR-V 2014",
    descripcion: "Parrilla frontal aerodinámica, faros proyectores halógenos y rines de aleación 17\"",
    url: "https://upload.wikimedia.org/wikipedia/commons/f/f1/2014_Honda_CR-V_2.4L_i-VTEC_%28with_opt._Modulo_Alpha_Package_bodykit%29_in_Cyberjaya%2C_Malaysia_%2801%29.jpg",
    anguloGrados: 45,
  },
  {
    id: "frontal-directo",
    titulo: "Frontal",
    subtitulo: "Frente y parrilla cromada",
    descripcion: "Parrilla de 3 barras cromadas con emblema Honda y faros antiniebla integrados",
    url: "https://upload.wikimedia.org/wikipedia/commons/7/7f/2014_Honda_CR-V_2.4L_i-VTEC_%28with_opt._Modulo_Alpha_Package_bodykit%29_in_Cyberjaya%2C_Malaysia_%2803%29.jpg",
    anguloGrados: 0,
  },
  {
    id: "lateral-perfil",
    titulo: "Perfil Lateral",
    subtitulo: "Silueta SUV aerodinámica",
    descripcion: "Molduras plásticas protectoras inferiores, barras de techo y cristales tintados de fábrica",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b2/Honda_CRV_2.4_SX_2013_%282%29.jpg",
    anguloGrados: 90,
  },
  {
    id: "trasero-tres-cuartos",
    titulo: "Trasero 3/4",
    subtitulo: "Diseño trasero de 4ta generación",
    descripcion: "Las inconfundibles luces verticales que envuelven el pilar D y spoiler superior",
    url: "https://upload.wikimedia.org/wikipedia/commons/b/b8/2014_Honda_CR-V_2.4L_i-VTEC_%28with_opt._Modulo_Alpha_Package_bodykit%29_in_Cyberjaya%2C_Malaysia_%2802%29.jpg",
    anguloGrados: 135,
  },
  {
    id: "trasero-directo",
    titulo: "Trasero",
    subtitulo: "Portón y baúl espacioso",
    descripcion: "Moldura cromada con emblema CR-V y amplia apertura de carga de 1,053 litros",
    url: "https://upload.wikimedia.org/wikipedia/commons/2/23/Honda_CRV_2.4_SX_2013_%283%29.jpg",
    anguloGrados: 180,
  },
  {
    id: "interior-cabina",
    titulo: "Interior / Cabina",
    subtitulo: "Puesto de conducción y tablero",
    descripcion: "Pantalla inteligente i-MID de 5\", volante multifunción y palanca de cambios en consola flotante",
    url: "https://upload.wikimedia.org/wikipedia/commons/3/36/Honda_CRV_2.4_SX_2013_Interior.jpg",
    anguloGrados: 270,
  },
];

// Colores disponibles para la carrocería en el modelo 3D
export const COLORES_VEHICULO = [
  { id: "blanco", nombre: "Blanco Perla (CR-V 2014)", hex: "#f4f5f8", metalness: 0.15, roughness: 0.2 },
  { id: "plata", nombre: "Plata Alabaster", hex: "#c7cbd1", metalness: 0.5, roughness: 0.25 },
  { id: "negro", nombre: "Negro Cristal", hex: "#18191c", metalness: 0.3, roughness: 0.15 },
  { id: "azul", nombre: "Azul Obsidiana", hex: "#1e375a", metalness: 0.4, roughness: 0.2 },
  { id: "rojo", nombre: "Rojo Vasco Perla", hex: "#8c1d28", metalness: 0.35, roughness: 0.2 },
];

/**
 * Genera el modelo 3D procedural con Three.js para la Honda CR-V 2014
 */
function construirHondaCRV(colorCarroceriaHex) {
  const carroceriaGroup = new THREE.Group();

  const materialPintura = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorCarroceriaHex),
    metalness: 0.25,
    roughness: 0.18,
  });

  const materialPlasticoNegro = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1f2327"),
    roughness: 0.85,
    metalness: 0.05,
  });

  const materialCromo = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#e8ecf0"),
    metalness: 0.9,
    roughness: 0.1,
  });

  const materialCristal = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#1a222d"),
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.6,
    transparent: true,
    opacity: 0.85,
  });

  const materialGoma = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#141517"),
    roughness: 0.9,
    metalness: 0.05,
  });

  const materialRines = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#d0d5db"),
    metalness: 0.8,
    roughness: 0.2,
  });

  const materialFaros = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#f5faff"),
    emissive: new THREE.Color("#d4e9ff"),
    emissiveIntensity: 0.4,
    roughness: 0.1,
  });

  const materialLucesTraseras = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#c41525"),
    emissive: new THREE.Color("#990c19"),
    emissiveIntensity: 0.4,
    roughness: 0.2,
  });

  // Chasis y carrocería
  const cuerpoInfGeo = new THREE.BoxGeometry(1.88, 0.65, 4.3);
  const cuerpoInf = new THREE.Mesh(cuerpoInfGeo, materialPintura);
  cuerpoInf.position.set(0, 0.75, 0);
  cuerpoInf.castShadow = true;
  cuerpoInf.receiveShadow = true;
  carroceriaGroup.add(cuerpoInf);

  const molduraInfGeo = new THREE.BoxGeometry(1.9, 0.28, 4.34);
  const molduraInf = new THREE.Mesh(molduraInfGeo, materialPlasticoNegro);
  molduraInf.position.set(0, 0.48, 0);
  carroceriaGroup.add(molduraInf);

  // Capó
  const capoGeo = new THREE.BoxGeometry(1.82, 0.2, 1.35);
  const capo = new THREE.Mesh(capoGeo, materialPintura);
  capo.position.set(0, 1.05, 1.45);
  capo.rotation.x = 0.08;
  carroceriaGroup.add(capo);

  // Cabina
  const cabinaGeo = new THREE.BoxGeometry(1.68, 0.68, 2.7);
  const cabina = new THREE.Mesh(cabinaGeo, materialPintura);
  cabina.position.set(0, 1.36, -0.25);
  carroceriaGroup.add(cabina);

  // Techo y barras de techo
  const techoGeo = new THREE.BoxGeometry(1.66, 0.08, 2.5);
  const techo = new THREE.Mesh(techoGeo, materialPintura);
  techo.position.set(0, 1.71, -0.28);
  carroceriaGroup.add(techo);

  const barraTechoGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.1, 8);
  const barraIzq = new THREE.Mesh(barraTechoGeo, materialCromo);
  barraIzq.rotation.x = Math.PI / 2;
  barraIzq.position.set(-0.76, 1.78, -0.25);
  const barraDer = barraIzq.clone();
  barraDer.position.x = 0.76;
  carroceriaGroup.add(barraIzq);
  carroceriaGroup.add(barraDer);

  // Cristales
  const parabrisasGeo = new THREE.PlaneGeometry(1.6, 0.85);
  const parabrisas = new THREE.Mesh(parabrisasGeo, materialCristal);
  parabrisas.position.set(0, 1.36, 1.05);
  parabrisas.rotation.x = -Math.PI / 4.4;
  carroceriaGroup.add(parabrisas);

  const lunetaGeo = new THREE.PlaneGeometry(1.5, 0.72);
  const luneta = new THREE.Mesh(lunetaGeo, materialCristal);
  luneta.position.set(0, 1.34, -1.61);
  luneta.rotation.x = Math.PI / 4.8;
  luneta.rotation.y = Math.PI;
  carroceriaGroup.add(luneta);

  const ventanaLatGeo = new THREE.PlaneGeometry(2.35, 0.48);
  const ventanaIzq = new THREE.Mesh(ventanaLatGeo, materialCristal);
  ventanaIzq.position.set(-0.85, 1.35, -0.25);
  ventanaIzq.rotation.y = -Math.PI / 2;
  const ventanaDer = new THREE.Mesh(ventanaLatGeo, materialCristal);
  ventanaDer.position.set(0.85, 1.35, -0.25);
  ventanaDer.rotation.y = Math.PI / 2;
  carroceriaGroup.add(ventanaIzq);
  carroceriaGroup.add(ventanaDer);

  // Parrilla frontal de 3 barras
  const parrillaFondoGeo = new THREE.BoxGeometry(1.2, 0.32, 0.08);
  const parrillaFondo = new THREE.Mesh(parrillaFondoGeo, materialPlasticoNegro);
  parrillaFondo.position.set(0, 0.88, 2.16);
  carroceriaGroup.add(parrillaFondo);

  [-0.08, 0, 0.08].forEach((offsetY) => {
    const barraParrillaGeo = new THREE.BoxGeometry(1.15, 0.032, 0.06);
    const barraParrilla = new THREE.Mesh(barraParrillaGeo, materialCromo);
    barraParrilla.position.set(0, 0.88 + offsetY, 2.19);
    carroceriaGroup.add(barraParrilla);
  });

  const emblemaGeo = new THREE.BoxGeometry(0.18, 0.16, 0.05);
  const emblema = new THREE.Mesh(emblemaGeo, materialCromo);
  emblema.position.set(0, 0.88, 2.22);
  carroceriaGroup.add(emblema);

  // Faros delanteros
  const faroGeo = new THREE.BoxGeometry(0.38, 0.18, 0.22);
  const faroIzq = new THREE.Mesh(faroGeo, materialFaros);
  faroIzq.position.set(-0.76, 0.92, 2.1);
  faroIzq.rotation.y = 0.25;
  const faroDer = faroIzq.clone();
  faroDer.position.x = 0.76;
  faroDer.rotation.y = -0.25;
  carroceriaGroup.add(faroIzq);
  carroceriaGroup.add(faroDer);

  // Luces traseras verticales icónicas de la CR-V
  const luzTraseraVerticalGeo = new THREE.BoxGeometry(0.14, 0.75, 0.16);
  const luzTraseraIzq = new THREE.Mesh(luzTraseraVerticalGeo, materialLucesTraseras);
  luzTraseraIzq.position.set(-0.84, 1.25, -2.05);
  const luzTraseraDer = luzTraseraIzq.clone();
  luzTraseraDer.position.x = 0.84;
  carroceriaGroup.add(luzTraseraIzq);
  carroceriaGroup.add(luzTraseraDer);

  // Ruedas y rines 17"
  const crearRueda = (x, z) => {
    const ruedaGroup = new THREE.Group();
    const neumaticoGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.24, 24);
    const neumatico = new THREE.Mesh(neumaticoGeo, materialGoma);
    neumatico.rotation.z = Math.PI / 2;
    neumatico.castShadow = true;
    ruedaGroup.add(neumatico);

    const rinGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.245, 18);
    const rin = new THREE.Mesh(rinGeo, materialRines);
    rin.rotation.z = Math.PI / 2;
    ruedaGroup.add(rin);

    for (let i = 0; i < 5; i++) {
      const angulo = (i * Math.PI * 2) / 5;
      const radioGeo = new THREE.BoxGeometry(0.04, 0.22, 0.05);
      const radio = new THREE.Mesh(radioGeo, materialRines);
      radio.position.set(x > 0 ? 0.12 : -0.12, Math.cos(angulo) * 0.11, Math.sin(angulo) * 0.11);
      radio.rotation.x = angulo;
      ruedaGroup.add(radio);
    }

    ruedaGroup.position.set(x, 0.38, z);
    return ruedaGroup;
  };

  carroceriaGroup.add(crearRueda(-0.88, 1.35));
  carroceriaGroup.add(crearRueda(0.88, 1.35));
  carroceriaGroup.add(crearRueda(-0.88, -1.35));
  carroceriaGroup.add(crearRueda(0.88, -1.35));

  // Sombra de contacto
  const canvasSombra = document.createElement("canvas");
  canvasSombra.width = 128;
  canvasSombra.height = 128;
  const ctxSombra = canvasSombra.getContext("2d");
  if (ctxSombra) {
    const grad = ctxSombra.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, "rgba(0,0,0,0.65)");
    grad.addColorStop(0.5, "rgba(0,0,0,0.3)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctxSombra.fillStyle = grad;
    ctxSombra.fillRect(0, 0, 128, 128);
  }
  const texturaSombra = new THREE.CanvasTexture(canvasSombra);
  const planoSombraGeo = new THREE.PlaneGeometry(2.4, 4.8);
  const planoSombraMat = new THREE.MeshBasicMaterial({
    map: texturaSombra,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
  });
  const planoSombra = new THREE.Mesh(planoSombraGeo, planoSombraMat);
  planoSombra.rotation.x = -Math.PI / 2;
  planoSombra.position.y = 0.01;
  carroceriaGroup.add(planoSombra);

  return {
    group: carroceriaGroup,
    materialPintura,
    materialFaros,
    materialLucesTraseras,
  };
}

export default function Vehiculo3DViewer({
  nombreVehiculo = "Honda CR-V 2014",
  colorInicial = "blanco",
  matricula = "",
  anio = "2014",
  onClose,
  esModal = false,
}) {
  // Pestañas principales: 'real360' (fotografía real 360°), 'modelo3d' (Three.js WebGL), 'ficha' (especificaciones)
  const [modoVista, setModoVista] = useState("real360");

  // Estado del visor 360° fotográfico real
  const [indiceFoto, setIndiceFoto] = useState(0);
  const [zoomFoto, setZoomFoto] = useState(1);
  const [arrastrandoFoto, setArrastrandoFoto] = useState(false);
  const fotoDragStartRef = useRef(0);
  const acumuladorArrastreRef = useRef(0);

  // Estado del modelo 3D Three.js
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const carDataRef = useRef(null);
  const animFrameIdRef = useRef(null);

  const [colorActual, setColorActual] = useState(colorInicial);
  const [autoRotar, setAutoRotar] = useState(true);
  const [lucesEncendidas, setLucesEncendidas] = useState(false);

  const isDragging3DRef = useRef(false);
  const prevMousePos3DRef = useRef({ x: 0, y: 0 });
  const rotacion3DRef = useRef({ yaw: 0.6, pitch: 0.28 });
  const distancia3DRef = useRef(6.2);

  // Inicializar Three.js cuando el modo 'modelo3d' está activo
  useEffect(() => {
    if (modoVista !== "modelo3d") return;
    const contenedor = mountRef.current;
    if (!contenedor) return;

    const width = contenedor.clientWidth || 400;
    const height = contenedor.clientHeight || 300;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color("#16181b");

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    contenedor.appendChild(renderer.domElement);

    // Luces
    scene.add(new THREE.AmbientLight("#dce3ec", 0.9));

    const luzPrincipal = new THREE.DirectionalLight("#ffffff", 1.8);
    luzPrincipal.position.set(6, 9, 7);
    luzPrincipal.castShadow = true;
    scene.add(luzPrincipal);

    const luzRelleno = new THREE.DirectionalLight("#8fa5bd", 0.9);
    luzRelleno.position.set(-6, 5, -5);
    scene.add(luzRelleno);

    // Piso y grid
    const piso = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.MeshStandardMaterial({ color: "#1a1c21", roughness: 0.6, metalness: 0.2 })
    );
    piso.rotation.x = -Math.PI / 2;
    piso.receiveShadow = true;
    scene.add(piso);

    const grid = new THREE.GridHelper(20, 20, "#2c3038", "#22252c");
    grid.position.y = 0.005;
    scene.add(grid);

    // Auto
    const colorObj = COLORES_VEHICULO.find((c) => c.id === colorActual) || COLORES_VEHICULO[0];
    const carData = construirHondaCRV(colorObj.hex);
    carDataRef.current = carData;
    scene.add(carData.group);

    const actualizarCamara = () => {
      const yaw = rotacion3DRef.current.yaw;
      const pitch = Math.max(0.05, Math.min(Math.PI / 2.2, rotacion3DRef.current.pitch));
      const dist = distancia3DRef.current;
      camera.position.x = dist * Math.sin(yaw) * Math.cos(pitch);
      camera.position.y = dist * Math.sin(pitch) + 0.5;
      camera.position.z = dist * Math.cos(yaw) * Math.cos(pitch);
      camera.lookAt(0, 0.85, 0);
    };
    actualizarCamara();

    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);
      if (autoRotar && !isDragging3DRef.current) {
        rotacion3DRef.current.yaw += 0.006;
        actualizarCamara();
      }
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!contenedor || !rendererRef.current || !cameraRef.current) return;
      const newW = contenedor.clientWidth;
      const newH = contenedor.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (rendererRef.current?.domElement) {
        contenedor.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
    };
  }, [modoVista]);

  // Actualizar color en modo 3D
  useEffect(() => {
    if (!carDataRef.current) return;
    const colorObj = COLORES_VEHICULO.find((c) => c.id === colorActual) || COLORES_VEHICULO[0];
    carDataRef.current.materialPintura.color.set(colorObj.hex);
    carDataRef.current.materialPintura.metalness = colorObj.metalness;
    carDataRef.current.materialPintura.roughness = colorObj.roughness;
  }, [colorActual]);

  // Actualizar luces en modo 3D
  useEffect(() => {
    if (!carDataRef.current) return;
    if (lucesEncendidas) {
      carDataRef.current.materialFaros.emissive.set("#badeff");
      carDataRef.current.materialFaros.emissiveIntensity = 1.6;
      carDataRef.current.materialLucesTraseras.emissive.set("#ff1a2b");
      carDataRef.current.materialLucesTraseras.emissiveIntensity = 1.4;
    } else {
      carDataRef.current.materialFaros.emissive.set("#d4e9ff");
      carDataRef.current.materialFaros.emissiveIntensity = 0.4;
      carDataRef.current.materialLucesTraseras.emissive.set("#990c19");
      carDataRef.current.materialLucesTraseras.emissiveIntensity = 0.4;
    }
  }, [lucesEncendidas]);

  // Controles de mouse / touch para el modo 360° fotográfico
  const handlePhotoMouseDown = (e) => {
    setArrastrandoFoto(true);
    fotoDragStartRef.current = e.clientX;
    acumuladorArrastreRef.current = 0;
  };

  const handlePhotoMouseMove = (e) => {
    if (!arrastrandoFoto) return;
    const deltaX = e.clientX - fotoDragStartRef.current;
    fotoDragStartRef.current = e.clientX;
    acumuladorArrastreRef.current += deltaX;

    // Cada 40px de arrastre cambia al siguiente ángulo
    const umbral = 40;
    if (Math.abs(acumuladorArrastreRef.current) >= umbral) {
      const pasos = Math.floor(acumuladorArrastreRef.current / umbral);
      setIndiceFoto((idx) => {
        let nuevo = idx - pasos;
        const total = FOTOS_REALES_CRV.length;
        while (nuevo < 0) nuevo += total;
        return nuevo % total;
      });
      acumuladorArrastreRef.current %= umbral;
    }
  };

  const handlePhotoMouseUp = () => {
    setArrastrandoFoto(false);
  };

  const handlePhotoTouchStart = (e) => {
    if (e.touches.length === 1) {
      setArrastrandoFoto(true);
      fotoDragStartRef.current = e.touches[0].clientX;
      acumuladorArrastreRef.current = 0;
    }
  };

  const handlePhotoTouchMove = (e) => {
    if (!arrastrandoFoto || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - fotoDragStartRef.current;
    fotoDragStartRef.current = e.touches[0].clientX;
    acumuladorArrastreRef.current += deltaX;

    const umbral = 35;
    if (Math.abs(acumuladorArrastreRef.current) >= umbral) {
      const pasos = Math.floor(acumuladorArrastreRef.current / umbral);
      setIndiceFoto((idx) => {
        let nuevo = idx - pasos;
        const total = FOTOS_REALES_CRV.length;
        while (nuevo < 0) nuevo += total;
        return nuevo % total;
      });
      acumuladorArrastreRef.current %= umbral;
    }
  };

  // Controles de mouse para Three.js 3D
  const onMouseDown3D = (e) => {
    isDragging3DRef.current = true;
    prevMousePos3DRef.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove3D = (e) => {
    if (!isDragging3DRef.current) return;
    const deltaX = e.clientX - prevMousePos3DRef.current.x;
    const deltaY = e.clientY - prevMousePos3DRef.current.y;
    prevMousePos3DRef.current = { x: e.clientX, y: e.clientY };

    rotacion3DRef.current.yaw -= deltaX * 0.009;
    rotacion3DRef.current.pitch += deltaY * 0.007;

    const pitch = Math.max(0.05, Math.min(Math.PI / 2.2, rotacion3DRef.current.pitch));
    const yaw = rotacion3DRef.current.yaw;
    const dist = distancia3DRef.current;
    if (cameraRef.current) {
      cameraRef.current.position.x = dist * Math.sin(yaw) * Math.cos(pitch);
      cameraRef.current.position.y = dist * Math.sin(pitch) + 0.5;
      cameraRef.current.position.z = dist * Math.cos(yaw) * Math.cos(pitch);
      cameraRef.current.lookAt(0, 0.85, 0);
    }
  };

  const onMouseUp3D = () => {
    isDragging3DRef.current = false;
  };

  const onWheel3D = (e) => {
    e.preventDefault();
    distancia3DRef.current = Math.max(3.5, Math.min(10.5, distancia3DRef.current + e.deltaY * 0.005));
    const pitch = Math.max(0.05, Math.min(Math.PI / 2.2, rotacion3DRef.current.pitch));
    const yaw = rotacion3DRef.current.yaw;
    const dist = distancia3DRef.current;
    if (cameraRef.current) {
      cameraRef.current.position.x = dist * Math.sin(yaw) * Math.cos(pitch);
      cameraRef.current.position.y = dist * Math.sin(pitch) + 0.5;
      cameraRef.current.position.z = dist * Math.cos(yaw) * Math.cos(pitch);
      cameraRef.current.lookAt(0, 0.85, 0);
    }
  };

  const fotoActual = FOTOS_REALES_CRV[indiceFoto] || FOTOS_REALES_CRV[0];

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        borderRadius: esModal ? 0 : 12,
        overflow: "hidden",
        background: "linear-gradient(180deg, #121417 0%, #1a1d22 100%)",
        border: esModal ? "none" : "1px solid var(--line)",
        userSelect: "none",
        boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
        color: "#fff",
      }}
    >
      {/* Barra de pestañas superior: Foto 360° Real vs Modelo 3D WebGL vs Ficha Técnica */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 14px",
          background: "rgba(10,12,15,0.85)",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          backdropFilter: "blur(8px)",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={() => setModoVista("real360")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              background: modoVista === "real360" ? "var(--sage)" : "rgba(255,255,255,0.06)",
              color: modoVista === "real360" ? "#fff" : "rgba(255,255,255,0.75)",
              border: modoVista === "real360" ? "1px solid var(--sage)" : "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Camera size={14} />
            Foto 360° Real (Honda CR-V Blanca)
          </button>

          <button
            onClick={() => setModoVista("modelo3d")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              background: modoVista === "modelo3d" ? "var(--sage)" : "rgba(255,255,255,0.06)",
              color: modoVista === "modelo3d" ? "#fff" : "rgba(255,255,255,0.75)",
              border: modoVista === "modelo3d" ? "1px solid var(--sage)" : "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Box size={14} />
            Modelo 3D Interactivo
          </button>

          <button
            onClick={() => setModoVista("ficha")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 7,
              fontSize: 12,
              fontWeight: 600,
              background: modoVista === "ficha" ? "var(--sage)" : "rgba(255,255,255,0.06)",
              color: modoVista === "ficha" ? "#fff" : "rgba(255,255,255,0.75)",
              border: modoVista === "ficha" ? "1px solid var(--sage)" : "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Info size={14} />
            Ficha Técnica Real
          </button>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            title="Cerrar vista"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* VISTA 1: FOTOGRAFÍA REAL 360° INTERACTIVA */}
      {modoVista === "real360" && (
        <div style={{ position: "relative", width: "100%", minHeight: 380, height: 420 }}>
          {/* Imagen principal con rotación por arrastre de mouse */}
          <div
            onMouseDown={handlePhotoMouseDown}
            onMouseMove={handlePhotoMouseMove}
            onMouseUp={handlePhotoMouseUp}
            onMouseLeave={handlePhotoMouseUp}
            onTouchStart={handlePhotoTouchStart}
            onTouchMove={handlePhotoTouchMove}
            onTouchEnd={handlePhotoMouseUp}
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: arrastrandoFoto ? "grabbing" : "grab",
              overflow: "hidden",
              position: "relative",
              background: "#0d0f12",
            }}
          >
            <img
              src={fotoActual.url}
              alt={fotoActual.titulo}
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                transform: `scale(${zoomFoto})`,
                transition: arrastrandoFoto ? "none" : "transform 0.2s ease",
                pointerEvents: "none",
              }}
              draggable={false}
            />

            {/* Flechas de rotación izquierda / derecha */}
            <button
              onClick={() => setIndiceFoto((idx) => (idx - 1 + FOTOS_REALES_CRV.length) % FOTOS_REALES_CRV.length)}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(6px)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={() => setIndiceFoto((idx) => (idx + 1) % FOTOS_REALES_CRV.length)}
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(6px)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.2)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
              }}
            >
              <ChevronRight size={20} />
            </button>

            {/* Etiqueta superior con ángulo y datos reales */}
            <div
              style={{
                position: "absolute",
                top: 14,
                left: 16,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                pointerEvents: "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                  style={{
                    background: "rgba(0,0,0,0.75)",
                    backdropFilter: "blur(6px)",
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.2)",
                    borderRadius: 6,
                    padding: "4px 9px",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  Honda CR-V 2014 Blanca · {fotoActual.titulo}
                </span>
                <span
                  style={{
                    background: "var(--sage)",
                    color: "#fff",
                    borderRadius: 4,
                    padding: "3px 7px",
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                  }}
                >
                  Fotografía Real HD
                </span>
              </div>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)", background: "rgba(0,0,0,0.5)", padding: "2px 6px", borderRadius: 4, width: "fit-content" }}>
                {fotoActual.descripcion}
              </span>
            </div>

            {/* Indicador de arrastre con el mouse */}
            <div
              style={{
                position: "absolute",
                top: 14,
                right: 16,
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(4px)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: 6,
                padding: "4px 8px",
                fontSize: 10.5,
                color: "rgba(255,255,255,0.8)",
                display: "flex",
                alignItems: "center",
                gap: 5,
                pointerEvents: "none",
              }}
            >
              <RotateCw size={12} style={{ color: "var(--sage)" }} />
              Arrastra con el mouse para rotar 360°
            </div>
          </div>

          {/* Selector de ángulos reales inferior */}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 14,
              right: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              flexWrap: "wrap",
            }}
          >
            {FOTOS_REALES_CRV.map((foto, idx) => {
              const activo = idx === indiceFoto;
              return (
                <button
                  key={foto.id}
                  onClick={() => setIndiceFoto(idx)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: activo ? 700 : 500,
                    background: activo ? "var(--sage)" : "rgba(0,0,0,0.7)",
                    color: activo ? "#fff" : "rgba(255,255,255,0.8)",
                    border: activo ? "1px solid var(--sage)" : "1px solid rgba(255,255,255,0.15)",
                    cursor: "pointer",
                    backdropFilter: "blur(4px)",
                    transition: "all 0.15s ease",
                  }}
                >
                  {foto.titulo}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 2: MODELO 3D EN TIEMPO REAL (THREE.JS WEBGL) */}
      {modoVista === "modelo3d" && (
        <div style={{ position: "relative", width: "100%", height: 380, minHeight: 300 }}>
          <div
            ref={mountRef}
            onMouseDown={onMouseDown3D}
            onMouseMove={onMouseMove3D}
            onMouseUp={onMouseUp3D}
            onMouseLeave={onMouseUp3D}
            onWheel={onWheel3D}
            style={{
              width: "100%",
              height: "100%",
              cursor: isDragging3DRef.current ? "grabbing" : "grab",
            }}
          />

          {/* Controles del modelo 3D */}
          <div style={{ position: "absolute", top: 12, right: 14, display: "flex", gap: 6 }}>
            <button
              onClick={() => setLucesEncendidas((s) => !s)}
              title={lucesEncendidas ? "Apagar faros" : "Encender faros LED"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 7,
                background: lucesEncendidas ? "rgba(255,220,100,0.25)" : "rgba(0,0,0,0.6)",
                border: lucesEncendidas ? "1px solid rgba(255,220,100,0.6)" : "1px solid rgba(255,255,255,0.15)",
                color: lucesEncendidas ? "#ffe27a" : "#fff",
                cursor: "pointer",
              }}
            >
              <Sun size={15} />
            </button>

            <button
              onClick={() => setAutoRotar((s) => !s)}
              title={autoRotar ? "Pausar rotación" : "Rotación automática"}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 32,
                height: 32,
                borderRadius: 7,
                background: autoRotar ? "rgba(86,171,95,0.25)" : "rgba(0,0,0,0.6)",
                border: autoRotar ? "1px solid rgba(86,171,95,0.6)" : "1px solid rgba(255,255,255,0.15)",
                color: autoRotar ? "var(--sage)" : "#fff",
                cursor: "pointer",
              }}
            >
              <RotateCw size={14} style={{ animation: autoRotar ? "spin 4s linear infinite" : "none" }} />
            </button>
          </div>

          {/* Selector de color */}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
              padding: "5px 10px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.75)", fontWeight: 500 }}>Color:</span>
            {COLORES_VEHICULO.map((col) => {
              const activo = col.id === colorActual;
              return (
                <button
                  key={col.id}
                  onClick={() => setColorActual(col.id)}
                  title={col.nombre}
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: col.hex,
                    border: activo ? "2px solid #56ab5f" : "1.5px solid rgba(255,255,255,0.3)",
                    boxShadow: activo ? "0 0 8px rgba(86,171,95,0.8)" : "none",
                    cursor: "pointer",
                  }}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* VISTA 3: FICHA TÉCNICA OFICIAL HONDA CR-V 2014 */}
      {modoVista === "ficha" && (
        <div style={{ padding: 18, background: "#13161a", minHeight: 380 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--sage-bg)", color: "var(--sage)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={20} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Honda CR-V 2014 (Generación 4)</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>Color original: Taffeta White / White Diamond Pearl</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Motorización</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>2.4L i-VTEC DOHC</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>185 HP @ 7,000 rpm · 163 lb-ft torque</div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Transmisión y Tracción</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>Automática 5 Velocidades</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Real Time AWD con sistema de control inteligente</div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Consumo Estimado</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>23 Ciudad / 31 Carretera MPG</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Modo ECON para ahorro de combustible</div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textTransform: "uppercase" }}>Capacidad de Carga</div>
              <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>1,053 a 2,007 Litros</div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Asientos traseros abatibles 60/40 en 1 toque</div>
            </div>
          </div>

          <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 12 }}>
            💡 Este modelo corresponde a tu Honda CR-V 2014 registrada en la sección <b>Activos</b>. Puedes alternar en cualquier momento entre la <b>Foto 360° Real</b> y el <b>Modelo 3D Interactivo</b> para rotar con el mouse.
          </div>
        </div>
      )}
    </div>
  );
}
