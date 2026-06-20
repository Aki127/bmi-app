// ====== BMI 3D Body Visualizer ======
// Three.js でコード生成した人体を、BMIに応じて連続的に変形させる。

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ---- 医療的な肥満度分類（日本肥満学会基準） ----
function classify(bmi){
  if(bmi < 18.5) return {name:'低体重（やせ）', color:'#63b3ed'};
  if(bmi < 25)   return {name:'普通体重',       color:'#4fd1c5'};
  if(bmi < 30)   return {name:'肥満（1度）',     color:'#f6e05e'};
  if(bmi < 35)   return {name:'肥満（2度）',     color:'#f6ad55'};
  if(bmi < 40)   return {name:'肥満（3度）',     color:'#fc8181'};
  return               {name:'肥満（4度）',     color:'#e53e3e'};
}

const $ = id => document.getElementById(id);
const height = $('height'), weight = $('weight'), slider = $('weightSlider');
const sliderVal = $('sliderVal'), bmiNumber = $('bmiNumber');
const categoryPill = $('categoryPill'), markerDot = $('markerDot');
const targetMsg = $('targetMsg'), stageTag = $('stageTag');

// ====== Three.js セットアップ ======
const stage = $('figureStage');
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
camera.position.set(0, 1.0, 6.2);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
stage.appendChild(renderer.domElement);

// 照明
scene.add(new THREE.HemisphereLight(0xffffff, 0x223040, 1.1));
const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(3, 6, 5);
scene.add(key);
const rim = new THREE.DirectionalLight(0x4fd1c5, 0.6);
rim.position.set(-4, 2, -3);
scene.add(rim);

// 回転操作
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableZoom = false;
controls.minPolarAngle = Math.PI * 0.3;
controls.maxPolarAngle = Math.PI * 0.62;
controls.target.set(0, 0.2, 0);
controls.autoRotate = true;
controls.autoRotateSpeed = 1.2;
controls.update();
renderer.domElement.addEventListener('pointerdown', ()=>{ controls.autoRotate = false; });

// ====== 人体パーツ ======
const bodyMat = new THREE.MeshStandardMaterial({ color:0x4fd1c5, roughness:0.55, metalness:0.05 });
const figure = new THREE.Group();
scene.add(figure);

const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 32, 24), bodyMat);
head.position.y = 1.85;

const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.0, 16, 32), bodyMat);
torso.position.y = 0.95;

const hips = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 24), bodyMat);
hips.position.y = 0.35;
hips.scale.set(1, 0.7, 0.9);

function makeLimb(r, len){
  return new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 12, 20), bodyMat);
}
const armL = makeLimb(0.17, 1.1); armL.position.set(-0.78, 1.0, 0); armL.rotation.z = 0.12;
const armR = makeLimb(0.17, 1.1); armR.position.set( 0.78, 1.0, 0); armR.rotation.z = -0.12;
const legL = makeLimb(0.22, 1.25); legL.position.set(-0.27, -0.6, 0);
const legR = makeLimb(0.22, 1.25); legR.position.set( 0.27, -0.6, 0);

figure.add(head, torso, hips, armL, armR, legL, legR);
figure.position.y = -0.3;

// ====== BMIによる変形 ======
function bmiToFat(bmi){
  const t = (bmi - 22) / 18;
  return 1 + Math.max(-0.25, t) * 1.0;
}

function applyBody(bmi){
  const fat = bmiToFat(bmi);
  const wide = 1 + (fat - 1) * 1.15;
  const headFat = 1 + (fat - 1) * 0.35;

  torso.scale.set(wide, 1, wide * 0.95);
  hips.scale.set(wide * 1.05, 0.7, wide * 0.95);
  head.scale.set(headFat, 1, headFat);
  armL.scale.set(1 + (fat-1)*0.7, 1, 1 + (fat-1)*0.7);
  armR.scale.copy(armL.scale);
  legL.scale.set(1 + (fat-1)*0.8, 1, 1 + (fat-1)*0.8);
  legR.scale.copy(legL.scale);

  const spread = (fat - 1) * 0.18;
  armL.position.x = -0.78 - spread;
  armR.position.x =  0.78 + spread;

  const cat = classify(bmi);
  bodyMat.color.set(cat.color);
}

// ====== 計算とUI更新 ======
function bmiToPercent(bmi){
  return Math.max(0, Math.min(100, (bmi - 15) / (40 - 15) * 100));
}
function updateSliderFill(){
  const v = parseFloat(slider.value);
  const pct = (v - slider.min) / (slider.max - slider.min) * 100;
  slider.style.setProperty('--fill', pct + '%');
}
function rangeLabel(bmi){
  if(bmi <= 21) return 'BMI 〜21';
  if(bmi <= 24) return 'BMI 21–24';
  if(bmi <= 28) return 'BMI 24–28';
  if(bmi <= 33) return 'BMI 28–33';
  return 'BMI 33〜';
}

function render(){
  const h = parseFloat(height.value);
  const w = parseFloat(weight.value);
  updateSliderFill();
  if(!h || !w || h <= 0){ return; }

  const bmi = w / Math.pow(h/100, 2);
  bmiNumber.textContent = (Math.round(bmi*10)/10).toFixed(1);

  const cat = classify(bmi);
  categoryPill.textContent = cat.name;
  categoryPill.style.background = cat.color;
  categoryPill.style.color = '#0f1419';

  markerDot.style.left = bmiToPercent(bmi) + '%';
  stageTag.textContent = rangeLabel(bmi);

  applyBody(bmi);

  document.querySelectorAll('.ref-row').forEach(row=>{
    const lo = parseFloat(row.dataset.lo), hi = parseFloat(row.dataset.hi);
    row.classList.toggle('active', bmi >= lo && bmi <= hi);
  });

  const standardW = 22 * Math.pow(h/100, 2);
  const diff = w - standardW;
  if(Math.abs(diff) < 0.5){
    targetMsg.innerHTML = '今の体重は標準体重（BMI22）とほぼ同じです。';
  } else if(diff > 0){
    const beautyDiff = w - 20*Math.pow(h/100,2);
    targetMsg.innerHTML = '標準体重（BMI22）まであと <b>' + diff.toFixed(1) + ' kg</b>。美容体重（BMI20）なら <b>' + beautyDiff.toFixed(1) + ' kg</b> 減が目安です。';
  } else {
    targetMsg.innerHTML = '標準体重（BMI22）より <b>' + Math.abs(diff).toFixed(1) + ' kg</b> 軽い状態です。';
  }
}

// ====== イベント ======
slider.addEventListener('input', ()=>{
  weight.value = parseFloat(slider.value).toFixed(1);
  sliderVal.textContent = parseFloat(slider.value).toFixed(1) + ' kg';
  render();
});
weight.addEventListener('input', ()=>{
  const v = parseFloat(weight.value);
  if(!isNaN(v)){
    slider.value = Math.max(slider.min, Math.min(slider.max, v));
    sliderVal.textContent = v.toFixed(1) + ' kg';
  }
  render();
});
height.addEventListener('input', render);

// ====== リサイズ対応 ======
function resize(){
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ====== 描画ループ ======
function animate(){
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();
render();
