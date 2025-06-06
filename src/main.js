import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// 创建场景
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// 创建相机
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 5);

// 创建渲染器
const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true,
    precision: 'highp'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制最大像素比
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// 创建地球
const earthGeometry = new THREE.SphereGeometry(2, 512, 512);
const earthTexture = new THREE.TextureLoader().load('/earth-texture.jpg', (texture) => {
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
});
const earthMaterial = new THREE.MeshPhongMaterial({
    map: earthTexture,
    bumpMap: earthTexture,
    bumpScale: 0.15,
    specularMap: earthTexture,
    specular: new THREE.Color(0x88ff88),
    shininess: 25,
    emissive: new THREE.Color(0x112211),
    emissiveIntensity: 0.4,
    normalScale: new THREE.Vector2(0.8, 0.8)
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
        
        // 增强对比度
        texColor.rgb = pow(texColor.rgb, vec3(0.9));
        
        // 判断是陆地还是海洋（基于纹理的亮度）
        float brightness = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
        bool isLand = brightness > 0.3;
        
        // 分别处理陆地和海洋的颜色
        vec3 enhancedColor;
        if (isLand) {
            // 陆地增强绿色和细节
            enhancedColor = texColor.rgb;
            enhancedColor.r *= 0.8;
            enhancedColor.g *= 1.4;
            enhancedColor.b *= 0.9;
            
            // 增强陆地细节
            float detail = sin(vUv.x * 100.0) * sin(vUv.y * 100.0) * 0.02;
            enhancedColor += vec3(detail);
        } else {
            // 海洋保持蓝色并增强深度感
            enhancedColor = texColor.rgb;
            enhancedColor.r *= 0.7;
            enhancedColor.g *= 0.8;
            enhancedColor.b *= 1.2;
            
            // 添加海洋波纹效果
            float wave = sin(vUv.x * 50.0 + time * 2.0) * sin(vUv.y * 50.0 + time * 2.0) * 0.02;
            enhancedColor += vec3(wave);
        }
        
        // 计算多个方向的光照
        vec3 lightDir1 = normalize(vec3(1.0, 1.0, 1.0));
        vec3 lightDir2 = normalize(vec3(-1.0, -1.0, -1.0));
        vec3 lightDir3 = normalize(vec3(-1.0, -1.0, 0.0));
        
        float light1 = max(0.0, dot(vNormal, lightDir1));
        float light2 = max(0.0, dot(vNormal, lightDir2));
        float light3 = max(0.0, dot(vNormal, lightDir3));
        
        // 合并光照效果
        float light = light1 + light2 * 0.5 + light3 * 0.7;
        light = pow(light, 1.1); // 降低光照衰减
        
        // 添加边缘光效
        float rimLight = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
        rimLight = pow(rimLight, 1.5);
        
        // 添加极光效果
        float aurora = sin(vPosition.y * 10.0 + time) * 0.5 + 0.5;
        aurora *= smoothstep(0.8, 1.0, abs(vPosition.y));
        vec3 auroraColor = vec3(0.0, 1.0, 0.5) * aurora * 0.3;
        
        // 合并所有效果
        vec3 finalColor = enhancedColor * (0.85 + 0.15 * light) + // 提高基础亮度
                         rimLight * vec3(0.0, 0.5, 0.3) + 
                         auroraColor;
        
        // 确保没有完全黑暗的区域
        finalColor = max(finalColor, vec3(0.15));
        
        // 最终颜色调整
        finalColor = pow(finalColor, vec3(0.95)); // 轻微提升对比度
        
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
            vec3 atmosphereColor = vec3(0.2, 0.8, 0.4);
            
            // 添加动态光效
            float light = dot(vNormal, normalize(vec3(1.0, 1.0, 1.0)));
            light = pow(light, 2.0);
            
            // 添加极光效果
            float aurora = sin(vPosition.y * 10.0 + time) * 0.5 + 0.5;
            aurora *= smoothstep(0.8, 1.0, abs(vPosition.y));
            vec3 auroraColor = vec3(0.0, 1.0, 0.5) * aurora * 0.3;
            
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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

// 添加定向光（模拟太阳光）
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
directionalLight.position.set(5, 3, 5);
scene.add(directionalLight);

// 添加点光源
const pointLight = new THREE.PointLight(0x88ccff, 0.8, 100);
pointLight.position.set(10, 10, 10);
scene.add(pointLight);

// 添加补光
const fillLight = new THREE.DirectionalLight(0x88ff88, 0.7);
fillLight.position.set(-5, -3, -5);
scene.add(fillLight);

// 添加额外的环境补光
const backLight = new THREE.DirectionalLight(0xffffff, 0.5);
backLight.position.set(-5, -3, -5);
scene.add(backLight);

// 添加左下角补光
const bottomLeftLight = new THREE.DirectionalLight(0xffffff, 0.6);
bottomLeftLight.position.set(-5, -5, -5);
scene.add(bottomLeftLight);

// 添加轨道控制器
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.rotateSpeed = 0.5;
controls.minDistance = 3;
controls.maxDistance = 10;
controls.enableZoom = true;
controls.autoRotate = false;
controls.enablePan = false;
controls.target.set(0, 0, 0);
controls.minPolarAngle = -Math.PI;
controls.maxPolarAngle = Math.PI;
controls.update();

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
            vec3 baseGlow = vec3(0.0, 0.8, 0.4);
            
            // 添加动态颜色变化
            float colorVariation = sin(time * 0.5) * 0.5 + 0.5;
            vec3 dynamicColor = mix(baseGlow, vec3(0.0, 1.0, 0.5), colorVariation);
            
            // 添加极光效果
            float aurora = sin(vPosition.y * 10.0 + time) * 0.5 + 0.5;
            aurora *= smoothstep(0.8, 1.0, abs(vPosition.y));
            vec3 auroraColor = vec3(0.0, 1.0, 0.5) * aurora * 0.3;
            
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

let time = 0;
let lastTime = 0;
let rotationSpeed = 0;
const maxRotationSpeed = 0.1;
const acceleration = 0.001;
const deceleration = 0.0005;

// 动画循环
function animate(currentTime) {
    requestAnimationFrame(animate);
    
    // 计算时间差
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    time += 0.01;
    
    // 更新着色器时间
    customMaterial.uniforms.time.value = time;
    atmosphereMaterial.uniforms.time.value = time;
    glowMaterial.uniforms.time.value = time;
    
    // 更新控制器
    controls.update();
    
    // 应用旋转速度
    if (controls.isDragging) {
        // 当用户拖动时增加速度
        rotationSpeed = Math.min(rotationSpeed + acceleration * deltaTime, maxRotationSpeed);
    } else {
        // 当用户停止拖动时逐渐减速
        rotationSpeed = Math.max(0, rotationSpeed - deceleration * deltaTime);
    }
    
    // 应用旋转
    if (rotationSpeed > 0) {
        earth.rotation.y += rotationSpeed;
    }
    
    // 渲染场景
    renderer.render(scene, camera);
}

// 开始动画循环
animate(0); 