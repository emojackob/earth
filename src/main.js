import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// 创建场景
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// 创建相机
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

// 创建渲染器
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true 
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

// 创建地球
const earthGeometry = new THREE.SphereGeometry(2, 256, 256);
const earthTexture = new THREE.TextureLoader().load('/earth-texture.jpg');
const earthMaterial = new THREE.MeshPhongMaterial({
    map: earthTexture,
    bumpMap: earthTexture,
    bumpScale: 0.1,
    specularMap: earthTexture,
    specular: new THREE.Color(0x666666),
    shininess: 15,
    emissive: new THREE.Color(0x112244),
    emissiveIntensity: 0.3,
    normalScale: new THREE.Vector2(0.5, 0.5)
});

// 添加颜色渐变效果
const vertexShader = `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const fragmentShader = `
    uniform sampler2D earthTexture;
    uniform float time;
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    
    void main() {
        vec4 texColor = texture2D(earthTexture, vUv);
        
        // 添加颜色增强
        vec3 enhancedColor = texColor.rgb;
        enhancedColor.r *= 1.2; // 增强红色
        enhancedColor.g *= 1.1; // 增强绿色
        enhancedColor.b *= 1.3; // 增强蓝色
        
        // 添加动态光效
        float light = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0)));
        light = pow(light, 2.0);
        
        // 添加极光效果
        float aurora = sin(vPosition.y * 10.0 + time) * 0.5 + 0.5;
        aurora *= smoothstep(0.8, 1.0, abs(vPosition.y));
        vec3 auroraColor = vec3(0.0, 0.8, 1.0) * aurora * 0.3;
        
        // 合并所有效果
        vec3 finalColor = enhancedColor * (0.7 + 0.3 * light) + auroraColor;
        
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

const customMaterial = new THREE.ShaderMaterial({
    uniforms: {
        earthTexture: { value: earthTexture },
        time: { value: 0 }
    },
    vertexShader: vertexShader,
    fragmentShader: fragmentShader
});

const earth = new THREE.Mesh(earthGeometry, customMaterial);
scene.add(earth);

// 添加大气层
const atmosphereGeometry = new THREE.SphereGeometry(2.1, 256, 256);
const atmosphereMaterial = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 }
    },
    vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            vec3 atmosphereColor = vec3(0.3, 0.6, 1.0);
            
            // 添加动态光效
            float light = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0)));
            light = pow(light, 2.0);
            
            // 添加极光效果
            float aurora = sin(vPosition.y * 10.0 + time) * 0.5 + 0.5;
            aurora *= smoothstep(0.8, 1.0, abs(vPosition.y));
            vec3 auroraColor = vec3(0.0, 0.8, 1.0) * aurora * 0.3;
            
            vec3 finalColor = atmosphereColor * intensity * (0.7 + 0.3 * light) + auroraColor;
            gl_FragColor = vec4(finalColor, intensity * 0.3);
        }
    `,
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending
});
const atmosphere = new THREE.Mesh(atmosphereGeometry, atmosphereMaterial);
scene.add(atmosphere);

// 添加环境光
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

// 添加定向光（模拟太阳光）
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
directionalLight.position.set(5, 3, 5);
scene.add(directionalLight);

// 添加点光源
const pointLight = new THREE.PointLight(0x88ccff, 1.5, 100);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

// 添加轨道控制器
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5;
controls.minDistance = 3;
controls.maxDistance = 10;

// 添加星空背景
const starGeometry = new THREE.BufferGeometry();
const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.1,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
});

const starVertices = [];
for (let i = 0; i < 20000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;
    starVertices.push(x, y, z);
}

starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
const stars = new THREE.Points(starGeometry, starMaterial);
scene.add(stars);

// 添加辉光效果
const glowGeometry = new THREE.SphereGeometry(2.2, 256, 256);
const glowMaterial = new THREE.ShaderMaterial({
    uniforms: {
        viewVector: { type: "v3", value: camera.position },
        time: { value: 0 }
    },
    vertexShader: `
        uniform vec3 viewVector;
        uniform float time;
        varying float intensity;
        varying vec3 vPosition;
        void main() {
            vec3 vNormal = normalize(normalMatrix * normal);
            vec3 vNormel = normalize(normalMatrix * viewVector);
            intensity = pow(0.6 - dot(vNormal, vNormel), 2.0);
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float time;
        varying float intensity;
        varying vec3 vPosition;
        void main() {
            // 基础辉光颜色
            vec3 baseGlow = vec3(0.0, 0.4, 1.0);
            
            // 添加动态颜色变化
            float colorVariation = sin(time * 0.5) * 0.5 + 0.5;
            vec3 dynamicColor = mix(baseGlow, vec3(0.0, 0.8, 1.0), colorVariation);
            
            // 添加极光效果
            float aurora = sin(vPosition.y * 10.0 + time) * 0.5 + 0.5;
            aurora *= smoothstep(0.8, 1.0, abs(vPosition.y));
            vec3 auroraColor = vec3(0.0, 0.8, 1.0) * aurora * 0.3;
            
            vec3 finalGlow = dynamicColor * intensity + auroraColor;
            gl_FragColor = vec4(finalGlow, 1.0);
        }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true
});
const glow = new THREE.Mesh(glowGeometry, glowMaterial);
scene.add(glow);

// 处理窗口大小变化
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

let time = 0;
// 动画循环
function animate() {
    requestAnimationFrame(animate);
    time += 0.01;
    
    // 更新着色器时间
    customMaterial.uniforms.time.value = time;
    atmosphereMaterial.uniforms.time.value = time;
    glowMaterial.uniforms.time.value = time;
    
    // 地球自转
    earth.rotation.y += 0.0005;
    atmosphere.rotation.y += 0.0005;
    glow.rotation.y += 0.0005;
    
    // 更新辉光效果
    glowMaterial.uniforms.viewVector.value = new THREE.Vector3().subVectors(
        camera.position,
        glow.position
    );
    
    controls.update();
    renderer.render(scene, camera);
}

animate(); 