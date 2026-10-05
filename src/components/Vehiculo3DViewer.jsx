import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RotateCw, ZoomIn, ZoomOut, Sun, Moon, Maximize2, Minimize2, Eye, Sparkles, X, Palette } from "lucide-react";

// Colores disponibles para la carrocería del vehículo
export const COLORES_VEHICULO = [
  { id: "blanco", nombre: "Blanco Perla (CR-V 2014)", hex: "#f4f5f8", metalness: 0.15, roughness: 0.2 },
  { id: "plata", nombre: "Plata Alabaster", hex: "#c7cbd1", metalness: 0.5, roughness: 0.25 },
  { id: "negro", nombre: "Negro Cristal", hex: "#18191c", metalness: 0.3, roughness: 0.15 },
  { id: "azul", nombre: "Azul Obsidiana", hex: "#1e375a", metalness: 0.4, roughness: 0.2 },
  { id: "rojo", nombre: "Rojo Vasco Perla", hex: "#8c1d28", metalness: 0.35, roughness: 0.2 },
];

/**
 * Genera el modelo 3D detallado de una SUV estilo Honda CR-V 2014 (Generación 4).
 * Proporciones aerodinámicas, parrilla frontal de tres barras, faros afilados,
 * molduras plásticas inferiores, barras de techo y las icónicas luces traseras verticales.
 */
function construirHondaCRV(colorCarroceriaHex) {
  const carroceriaGroup = new THREE.Group();

  // Material de pintura de auto
  const materialPintura = new THREE.MeshStandardMaterial({
    color: new THREE.Color(colorCarroceriaHex),
    metalness: 0.25,
    roughness: 0.18,
  });

  // Material de plástico negro / molduras inferiores SUV
  const materialPlasticoNegro = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#1f2327"),
    roughness: 0.85,
    metalness: 0.05,
  });

  // Material de cromo (parrilla, molduras de ventanas, manijas)
  const materialCromo = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#e8ecf0"),
    metalness: 0.9,
    roughness: 0.1,
  });

  // Material de cristales tintados
  const materialCristal = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#1a222d"),
    metalness: 0.1,
    roughness: 0.05,
    transmission: 0.6,
    transparent: true,
    opacity: 0.85,
  });

  // Material de llantas (goma)
  const materialGoma = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#141517"),
    roughness: 0.9,
    metalness: 0.05,
  });

  // Material rines de aleación 17"
  const materialRines = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#d0d5db"),
    metalness: 0.8,
    roughness: 0.2,
  });

  // Faros delanteros y luces traseras
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

  // 1. CHASSIS / CUERPO PRINCIPAL INFERIOR DE LA CR-V
  // Longitud ~4.5m, ancho ~1.8m, altura ~1.65m (escalado en unidades 3D: L=4.4, W=1.9, H=1.6)
  const cuerpoInfGeo = new THREE.BoxGeometry(1.88, 0.65, 4.3);
  const cuerpoInf = new THREE.Mesh(cuerpoInfGeo, materialPintura);
  cuerpoInf.position.set(0, 0.75, 0);
  cuerpoInf.castShadow = true;
  cuerpoInf.receiveShadow = true;
  carroceriaGroup.add(cuerpoInf);

  // Moldura protectora inferior negra (Rocker panel clásico de la CR-V 2014)
  const molduraInfGeo = new THREE.BoxGeometry(1.9, 0.28, 4.34);
  const molduraInf = new THREE.Mesh(molduraInfGeo, materialPlasticoNegro);
  molduraInf.position.set(0, 0.48, 0);
  carroceriaGroup.add(molduraInf);

  // 2. CAPÓ INCLINADO DELANTERO
  const capoGeo = new THREE.BoxGeometry(1.82, 0.2, 1.35);
  const capo = new THREE.Mesh(capoGeo, materialPintura);
  capo.position.set(0, 1.05, 1.45);
  capo.rotation.x = 0.08;
  carroceriaGroup.add(capo);

  // Líneas de carácter en el capó (nervaduras de la CR-V)
  const nervaduraGeo = new THREE.BoxGeometry(0.12, 0.04, 1.25);
  const nervaduraIzq = new THREE.Mesh(nervaduraGeo, materialPintura);
  nervaduraIzq.position.set(-0.55, 1.13, 1.43);
  nervaduraIzq.rotation.x = 0.08;
  const nervaduraDer = nervaduraIzq.clone();
  nervaduraDer.position.x = 0.55;
  carroceriaGroup.add(nervaduraIzq);
  carroceriaGroup.add(nervaduraDer);

  // 3. CABINA / TECHO Y VENTANAS (Greenhouse de SUV)
  const cabinaGeo = new THREE.BoxGeometry(1.68, 0.68, 2.7);
  const cabina = new THREE.Mesh(cabinaGeo, materialPintura);
  cabina.position.set(0, 1.36, -0.25);
  carroceriaGroup.add(cabina);

  // Techo inclinado trasero (aerodinámico CR-V)
  const techoGeo = new THREE.BoxGeometry(1.66, 0.08, 2.5);
  const techo = new THREE.Mesh(techoGeo, materialPintura);
  techo.position.set(0, 1.71, -0.28);
  carroceriaGroup.add(techo);

  // Techo solar (Sunroof)
  const sunroofGeo = new THREE.BoxGeometry(1.0, 0.02, 0.7);
  const sunroof = new THREE.Mesh(sunroofGeo, materialCristal);
  sunroof.position.set(0, 1.74, 0.3);
  carroceriaGroup.add(sunroof);

  // Barras de techo longitudinales (Roof rails características de la CR-V)
  const barraTechoGeo = new THREE.CylinderGeometry(0.025, 0.025, 2.1, 8);
  const barraIzq = new THREE.Mesh(barraTechoGeo, materialCromo);
  barraIzq.rotation.x = Math.PI / 2;
  barraIzq.position.set(-0.76, 1.78, -0.25);
  const barraDer = barraIzq.clone();
  barraDer.position.x = 0.76;
  carroceriaGroup.add(barraIzq);
  carroceriaGroup.add(barraDer);

  // Soportes de las barras
  [-1.1, -0.25, 0.65].forEach((posZ) => {
    const soporteGeo = new THREE.BoxGeometry(0.06, 0.1, 0.08);
    const sopIzq = new THREE.Mesh(soporteGeo, materialPlasticoNegro);
    sopIzq.position.set(-0.76, 1.73, posZ);
    const sopDer = sopIzq.clone();
    sopDer.position.x = 0.76;
    carroceriaGroup.add(sopIzq);
    carroceriaGroup.add(sopDer);
  });

  // Parabrisas delantero inclinado
  const parabrisasGeo = new THREE.PlaneGeometry(1.6, 0.85);
  const parabrisas = new THREE.Mesh(parabrisasGeo, materialCristal);
  parabrisas.position.set(0, 1.36, 1.05);
  parabrisas.rotation.x = -Math.PI / 4.4;
  carroceriaGroup.add(parabrisas);

  // Luneta trasera (parabrisas trasero inclinado característico de la CR-V 2014)
  const lunetaGeo = new THREE.PlaneGeometry(1.5, 0.72);
  const luneta = new THREE.Mesh(lunetaGeo, materialCristal);
  luneta.position.set(0, 1.34, -1.61);
  luneta.rotation.x = Math.PI / 4.8;
  luneta.rotation.y = Math.PI;
  carroceriaGroup.add(luneta);

  // Ventanas laterales
  const ventanaLatGeo = new THREE.PlaneGeometry(2.35, 0.48);
  const ventanaIzq = new THREE.Mesh(ventanaLatGeo, materialCristal);
  ventanaIzq.position.set(-0.85, 1.35, -0.25);
  ventanaIzq.rotation.y = -Math.PI / 2;
  const ventanaDer = new THREE.Mesh(ventanaLatGeo, materialCristal);
  ventanaDer.position.set(0.85, 1.35, -0.25);
  ventanaDer.rotation.y = Math.PI / 2;
  carroceriaGroup.add(ventanaIzq);
  carroceriaGroup.add(ventanaDer);

  // Marcos de ventanas cromados (Chrome trim)
  const molduraVentanaGeo = new THREE.BoxGeometry(0.02, 0.03, 2.4);
  const molduraVentanaIzq = new THREE.Mesh(molduraVentanaGeo, materialCromo);
  molduraVentanaIzq.position.set(-0.86, 1.11, -0.25);
  const molduraVentanaDer = molduraVentanaIzq.clone();
  molduraVentanaDer.position.x = 0.86;
  carroceriaGroup.add(molduraVentanaIzq);
  carroceriaGroup.add(molduraVentanaDer);

  // 4. PARRILLA DELANTERA HONDA (3 barras cromadas horizontales)
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

  // Emblema frontal (H de Honda estilizada)
  const emblemaGeo = new THREE.BoxGeometry(0.18, 0.16, 0.05);
  const emblema = new THREE.Mesh(emblemaGeo, materialCromo);
  emblema.position.set(0, 0.88, 2.22);
  carroceriaGroup.add(emblema);

  // Paragolpes delantero inferior con skid plate
  const skidPlateGeo = new THREE.BoxGeometry(1.1, 0.14, 0.1);
  const skidPlate = new THREE.Mesh(skidPlateGeo, materialCromo);
  skidPlate.position.set(0, 0.42, 2.16);
  carroceriaGroup.add(skidPlate);

  // 5. FAROS DELANTEROS (Afilados hacia las aletas, característicos)
  const faroGeo = new THREE.BoxGeometry(0.38, 0.18, 0.22);
  const faroIzq = new THREE.Mesh(faroGeo, materialFaros);
  faroIzq.position.set(-0.76, 0.92, 2.1);
  faroIzq.rotation.y = 0.25;
  const faroDer = faroIzq.clone();
  faroDer.position.x = 0.76;
  faroDer.rotation.y = -0.25;
  carroceriaGroup.add(faroIzq);
  carroceriaGroup.add(faroDer);

  // Luces antiniebla delanteras en paragolpes
  const antinieblaGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12);
  const antinieblaIzq = new THREE.Mesh(antinieblaGeo, materialFaros);
  antinieblaIzq.rotation.x = Math.PI / 2;
  antinieblaIzq.position.set(-0.72, 0.52, 2.14);
  const antinieblaDer = antinieblaIzq.clone();
  antinieblaDer.position.x = 0.72;
  carroceriaGroup.add(antinieblaIzq);
  carroceriaGroup.add(antinieblaDer);

  // 6. LUCES TRASERAS VERTICALES DE LA CR-V (Envuelven el pilar D hasta el techo)
  const luzTraseraVerticalGeo = new THREE.BoxGeometry(0.14, 0.75, 0.16);
  const luzTraseraIzq = new THREE.Mesh(luzTraseraVerticalGeo, materialLucesTraseras);
  luzTraseraIzq.position.set(-0.84, 1.25, -2.05);
  const luzTraseraDer = luzTraseraIzq.clone();
  luzTraseraDer.position.x = 0.84;
  carroceriaGroup.add(luzTraseraIzq);
  carroceriaGroup.add(luzTraseraDer);

  // Barra embellecedora cromada del portón trasero (con el nombre CR-V)
  const barraTraseraCromadaGeo = new THREE.BoxGeometry(0.95, 0.06, 0.05);
  const barraTraseraCromada = new THREE.Mesh(barraTraseraCromadaGeo, materialCromo);
  barraTraseraCromada.position.set(0, 0.98, -2.16);
  carroceriaGroup.add(barraTraseraCromada);

  // Spoiler trasero superior sobre la luneta
  const spoilerGeo = new THREE.BoxGeometry(1.68, 0.06, 0.28);
  const spoiler = new THREE.Mesh(spoilerGeo, materialPintura);
  spoiler.position.set(0, 1.72, -1.68);
  carroceriaGroup.add(spoiler);

  // Espejos retrovisores exteriores con direccionales integradas
  [-1, 1].forEach((lado) => {
    const espejoGroup = new THREE.Group();
    const carcasaGeo = new THREE.BoxGeometry(0.24, 0.14, 0.12);
    const carcasa = new THREE.Mesh(carcasaGeo, materialPintura);
    espejoGroup.add(carcasa);
    const soporteEspejoGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.14);
    const soporte = new THREE.Mesh(soporteEspejoGeo, materialPlasticoNegro);
    soporte.position.set(-lado * 0.09, -0.06, 0);
    soporte.rotation.z = lado * 0.4;
    espejoGroup.add(soporte);
    espejoGroup.position.set(lado * 1.04, 1.15, 0.85);
    carroceriaGroup.add(espejoGroup);
  });

  // Manijas de las puertas cromadas
  [-0.95, 0.95].forEach((posX) => {
    [0.25, -0.55].forEach((posZ) => {
      const manijaGeo = new THREE.BoxGeometry(0.04, 0.035, 0.15);
      const manija = new THREE.Mesh(manijaGeo, materialCromo);
      manija.position.set(posX, 1.02, posZ);
      carroceriaGroup.add(manija);
    });
  });

  // Antena estilo aleta de tiburón en el techo trasero
  const antenaGeo = new THREE.ConeGeometry(0.05, 0.12, 4);
  const antena = new THREE.Mesh(antenaGeo, materialPintura);
  antena.position.set(0, 1.81, -1.1);
  antena.rotation.x = -0.3;
  carroceriaGroup.add(antena);

  // 7. RUEDAS Y NEUMÁTICOS 17" CON RINES DE 5 RADIOS
  const crearRueda = (x, z) => {
    const ruedaGroup = new THREE.Group();

    // Neumático de caucho
    const neumaticoGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.24, 24);
    const neumatico = new THREE.Mesh(neumaticoGeo, materialGoma);
    neumatico.rotation.z = Math.PI / 2;
    neumatico.castShadow = true;
    ruedaGroup.add(neumatico);

    // Llanta / Rin exterior
    const rinGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.245, 18);
    const rin = new THREE.Mesh(rinGeo, materialRines);
    rin.rotation.z = Math.PI / 2;
    ruedaGroup.add(rin);

    // 5 radios de aleación esculpidos
    for (let i = 0; i < 5; i++) {
      const angulo = (i * Math.PI * 2) / 5;
      const radioGeo = new THREE.BoxGeometry(0.04, 0.22, 0.05);
      const radio = new THREE.Mesh(radioGeo, materialRines);
      radio.position.set(x > 0 ? 0.12 : -0.12, Math.cos(angulo) * 0.11, Math.sin(angulo) * 0.11);
      radio.rotation.x = angulo;
      ruedaGroup.add(radio);
    }

    // Tapa central con logo
    const tapaGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.26, 12);
    const tapa = new THREE.Mesh(tapaGeo, materialCromo);
    tapa.rotation.z = Math.PI / 2;
    ruedaGroup.add(tapa);

    // Disco de freno visible detrás
    const discoGeo = new THREE.CylinderGeometry(0.21, 0.21, 0.04, 16);
    const disco = new THREE.Mesh(discoGeo, materialCromo);
    disco.rotation.z = Math.PI / 2;
    disco.position.x = x > 0 ? -0.04 : 0.04;
    ruedaGroup.add(disco);

    ruedaGroup.position.set(x, 0.38, z);
    return ruedaGroup;
  };

  // Posición de las 4 ruedas (distancia entre ejes ~2.62m, ancho de vía ~1.57m)
  const ruedaDelIzq = crearRueda(-0.88, 1.35);
  const ruedaDelDer = crearRueda(0.88, 1.35);
  const ruedaTrasIzq = crearRueda(-0.88, -1.35);
  const ruedaTrasDer = crearRueda(0.88, -1.35);

  carroceriaGroup.add(ruedaDelIzq);
  carroceriaGroup.add(ruedaDelDer);
  carroceriaGroup.add(ruedaTrasIzq);
  carroceriaGroup.add(ruedaTrasDer);

  // 8. SOMBRA REALISTA DEBAJO DEL VEHÍCULO
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
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const carDataRef = useRef(null);
  const animFrameIdRef = useRef(null);

  const [colorActual, setColorActual] = useState(colorInicial);
  const [autoRotar, setAutoRotar] = useState(true);
  const [lucesEncendidas, setLucesEncendidas] = useState(false);
  const [pantallaCompleta, setPantallaCompleta] = useState(false);

  // Parámetros de órbita y control por mouse / touch
  const isDraggingRef = useRef(false);
  const prevMousePosRef = useRef({ x: 0, y: 0 });
  const rotacionRef = useRef({ yaw: 0.6, pitch: 0.28 });
  const distanciaRef = useRef(6.2);

  // Inicialización de Three.js
  useEffect(() => {
    const contenedor = mountRef.current;
    if (!contenedor) return;

    const width = contenedor.clientWidth || 400;
    const height = contenedor.clientHeight || 300;

    // Escena
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color("#16181b");

    // Cámara con perspectiva realista
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    cameraRef.current = camera;

    // Renderizador con soporte de sombras y antialiasing
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    contenedor.appendChild(renderer.domElement);

    // Iluminación de estudio automotriz
    const luzAmbiente = new THREE.AmbientLight("#dce3ec", 0.9);
    scene.add(luzAmbiente);

    const luzPrincipal = new THREE.DirectionalLight("#ffffff", 1.8);
    luzPrincipal.position.set(6, 9, 7);
    luzPrincipal.castShadow = true;
    luzPrincipal.shadow.mapSize.width = 1024;
    luzPrincipal.shadow.mapSize.height = 1024;
    scene.add(luzPrincipal);

    const luzRelleno = new THREE.DirectionalLight("#8fa5bd", 0.9);
    luzRelleno.position.set(-6, 5, -5);
    scene.add(luzRelleno);

    const luzTecho = new THREE.DirectionalLight("#ffffff", 1.0);
    luzTecho.position.set(0, 10, 0);
    scene.add(luzTecho);

    // Piso de estudio reflectante sutil
    const pisoGeo = new THREE.PlaneGeometry(30, 30);
    const pisoMat = new THREE.MeshStandardMaterial({
      color: "#1a1c21",
      roughness: 0.6,
      metalness: 0.2,
    });
    const piso = new THREE.Mesh(pisoGeo, pisoMat);
    piso.rotation.x = -Math.PI / 2;
    piso.position.y = 0;
    piso.receiveShadow = true;
    scene.add(piso);

    // Rejilla de estudio elegante
    const grid = new THREE.GridHelper(20, 20, "#2c3038", "#22252c");
    grid.position.y = 0.005;
    scene.add(grid);

    // Construir la Honda CR-V 2014
    const colorObj = COLORES_VEHICULO.find((c) => c.id === colorActual) || COLORES_VEHICULO[0];
    const carData = construirHondaCRV(colorObj.hex);
    carDataRef.current = carData;
    scene.add(carData.group);

    // Actualizar posición de cámara en coordenadas esféricas
    const actualizarCamara = () => {
      const yaw = rotacionRef.current.yaw;
      const pitch = Math.max(0.05, Math.min(Math.PI / 2.2, rotacionRef.current.pitch));
      const dist = distanciaRef.current;

      camera.position.x = dist * Math.sin(yaw) * Math.cos(pitch);
      camera.position.y = dist * Math.sin(pitch) + 0.5;
      camera.position.z = dist * Math.cos(yaw) * Math.cos(pitch);
      camera.lookAt(0, 0.85, 0);
    };

    actualizarCamara();

    // Loop de renderizado
    const animate = () => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      if (autoRotar && !isDraggingRef.current) {
        rotacionRef.current.yaw += 0.006;
        actualizarCamara();
      }

      renderer.render(scene, camera);
    };
    animate();

    // Eventos de redimensionamiento
    const handleResize = () => {
      if (!contenedor || !rendererRef.current || !cameraRef.current) return;
      const newW = contenedor.clientWidth;
      const newH = contenedor.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };
    window.addEventListener("resize", handleResize);

    // Limpieza al desmontar
    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (rendererRef.current?.domElement) {
        contenedor.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Actualizar color de la pintura
  useEffect(() => {
    if (!carDataRef.current) return;
    const colorObj = COLORES_VEHICULO.find((c) => c.id === colorActual) || COLORES_VEHICULO[0];
    carDataRef.current.materialPintura.color.set(colorObj.hex);
    carDataRef.current.materialPintura.metalness = colorObj.metalness;
    carDataRef.current.materialPintura.roughness = colorObj.roughness;
  }, [colorActual]);

  // Actualizar estado de las luces (encendidas / apagadas)
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

  // Manejo de interacción de mouse / touch para rotación 3D
  const onMouseDown = (e) => {
    isDraggingRef.current = true;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e) => {
    if (!isDraggingRef.current) return;
    const deltaX = e.clientX - prevMousePosRef.current.x;
    const deltaY = e.clientY - prevMousePosRef.current.y;
    prevMousePosRef.current = { x: e.clientX, y: e.clientY };

    rotacionRef.current.yaw -= deltaX * 0.009;
    rotacionRef.current.pitch += deltaY * 0.007;

    const pitch = Math.max(0.05, Math.min(Math.PI / 2.2, rotacionRef.current.pitch));
    const yaw = rotacionRef.current.yaw;
    const dist = distanciaRef.current;
    if (cameraRef.current) {
      cameraRef.current.position.x = dist * Math.sin(yaw) * Math.cos(pitch);
      cameraRef.current.position.y = dist * Math.sin(pitch) + 0.5;
      cameraRef.current.position.z = dist * Math.cos(yaw) * Math.cos(pitch);
      cameraRef.current.lookAt(0, 0.85, 0);
    }
  };

  const onMouseUp = () => {
    isDraggingRef.current = false;
  };

  const onWheel = (e) => {
    e.preventDefault();
    distanciaRef.current = Math.max(3.5, Math.min(10.5, distanciaRef.current + e.deltaY * 0.005));
    const pitch = Math.max(0.05, Math.min(Math.PI / 2.2, rotacionRef.current.pitch));
    const yaw = rotacionRef.current.yaw;
    const dist = distanciaRef.current;
    if (cameraRef.current) {
      cameraRef.current.position.x = dist * Math.sin(yaw) * Math.cos(pitch);
      cameraRef.current.position.y = dist * Math.sin(pitch) + 0.5;
      cameraRef.current.position.z = dist * Math.cos(yaw) * Math.cos(pitch);
      cameraRef.current.lookAt(0, 0.85, 0);
    }
  };

  // Soporte de touch para móviles
  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      isDraggingRef.current = true;
      prevMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const onTouchMove = (e) => {
    if (!isDraggingRef.current || e.touches.length !== 1) return;
    const deltaX = e.touches[0].clientX - prevMousePosRef.current.x;
    const deltaY = e.touches[0].clientY - prevMousePosRef.current.y;
    prevMousePosRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

    rotacionRef.current.yaw -= deltaX * 0.012;
    rotacionRef.current.pitch += deltaY * 0.009;

    const pitch = Math.max(0.05, Math.min(Math.PI / 2.2, rotacionRef.current.pitch));
    const yaw = rotacionRef.current.yaw;
    const dist = distanciaRef.current;
    if (cameraRef.current) {
      cameraRef.current.position.x = dist * Math.sin(yaw) * Math.cos(pitch);
      cameraRef.current.position.y = dist * Math.sin(pitch) + 0.5;
      cameraRef.current.position.z = dist * Math.cos(yaw) * Math.cos(pitch);
      cameraRef.current.lookAt(0, 0.85, 0);
    }
  };

  const onTouchEnd = () => {
    isDraggingRef.current = false;
  };

  // Botón para restablecer vista
  const restablecerVista = () => {
    rotacionRef.current = { yaw: 0.65, pitch: 0.28 };
    distanciaRef.current = 6.2;
    const pitch = 0.28;
    const yaw = 0.65;
    const dist = 6.2;
    if (cameraRef.current) {
      cameraRef.current.position.x = dist * Math.sin(yaw) * Math.cos(pitch);
      cameraRef.current.position.y = dist * Math.sin(pitch) + 0.5;
      cameraRef.current.position.z = dist * Math.cos(yaw) * Math.cos(pitch);
      cameraRef.current.lookAt(0, 0.85, 0);
    }
  };

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: esModal ? "100%" : 360,
        minHeight: 280,
        borderRadius: esModal ? 0 : 12,
        overflow: "hidden",
        background: "linear-gradient(180deg, #15171a 0%, #1a1d22 100%)",
        border: esModal ? "none" : "1px solid var(--line)",
        userSelect: "none",
        boxShadow: "inset 0 0 40px rgba(0,0,0,0.5)",
      }}
    >
      {/* Contenedor del lienzo WebGL de Three.js */}
      <div
        ref={mountRef}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          width: "100%",
          height: "100%",
          cursor: isDraggingRef.current ? "grabbing" : "grab",
        }}
      />

      {/* Insignia y datos del vehículo superior izquierdo */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 14,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span
            style={{
              background: "rgba(0,0,0,0.65)",
              backdropFilter: "blur(6px)",
              color: "#fff",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 6,
              padding: "3px 8px",
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: "0.02em",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <Sparkles size={12} style={{ color: "var(--sage)" }} />
            {nombreVehiculo} ({anio})
          </span>
          {matricula && (
            <span
              style={{
                background: "rgba(255,255,255,0.9)",
                color: "#111",
                borderRadius: 4,
                padding: "2px 6px",
                fontSize: 10,
                fontWeight: 700,
                fontFamily: "monospace",
                letterSpacing: "0.05em",
              }}
            >
              {matricula}
            </span>
          )}
        </div>
        <span
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.7)",
            background: "rgba(0,0,0,0.4)",
            padding: "2px 6px",
            borderRadius: 4,
            width: "fit-content",
          }}
        >
          Arrastra con el mouse para rotar 360° · Rueda para zoom
        </span>
      </div>

      {/* Botones de acción superior derecho */}
      <div
        style={{
          position: "absolute",
          top: 12,
          right: 14,
          display: "flex",
          gap: 6,
        }}
      >
        <button
          onClick={() => setLucesEncendidas((s) => !s)}
          title={lucesEncendidas ? "Apagar luces" : "Encender faros LED"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 7,
            background: lucesEncendidas ? "rgba(255,220,100,0.25)" : "rgba(0,0,0,0.55)",
            border: lucesEncendidas ? "1px solid rgba(255,220,100,0.6)" : "1px solid rgba(255,255,255,0.15)",
            color: lucesEncendidas ? "#ffe27a" : "#fff",
            cursor: "pointer",
            backdropFilter: "blur(4px)",
          }}
        >
          <Sun size={15} />
        </button>

        <button
          onClick={() => setAutoRotar((s) => !s)}
          title={autoRotar ? "Pausar rotación automática" : "Rotación automática 360°"}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 7,
            background: autoRotar ? "rgba(86,171,95,0.25)" : "rgba(0,0,0,0.55)",
            border: autoRotar ? "1px solid rgba(86,171,95,0.6)" : "1px solid rgba(255,255,255,0.15)",
            color: autoRotar ? "var(--sage)" : "#fff",
            cursor: "pointer",
            backdropFilter: "blur(4px)",
          }}
        >
          <RotateCw size={14} style={{ animation: autoRotar ? "spin 4s linear infinite" : "none" }} />
        </button>

        <button
          onClick={restablecerVista}
          title="Vista inicial 3/4"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 7,
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            cursor: "pointer",
            backdropFilter: "blur(4px)",
          }}
        >
          <Eye size={14} />
        </button>

        {onClose && (
          <button
            onClick={onClose}
            title="Cerrar vista 3D"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 7,
              background: "rgba(220,50,50,0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              cursor: "pointer",
              backdropFilter: "blur(4px)",
            }}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Selector de color de pintura inferior */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 14,
          right: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          pointerEvents: "auto",
        }}
      >
        {/* Muestras de color */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            padding: "5px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.75)", fontWeight: 500, marginRight: 2 }}>
            Color:
          </span>
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
                  transform: activo ? "scale(1.15)" : "scale(1)",
                  transition: "transform 0.15s ease",
                }}
              />
            );
          })}
        </div>

        {/* Ficha técnica mínima */}
        <div
          style={{
            fontSize: 10,
            color: "rgba(255,255,255,0.7)",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            padding: "5px 10px",
            borderRadius: 8,
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          2.4L i-VTEC · Tracción Real Time · Rines 17"
        </div>
      </div>
    </div>
  );
}
