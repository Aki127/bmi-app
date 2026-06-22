// ====== BMI 3D Body Visualizer (本物の人体モデル + モーフ) ======
// body.glb を読み込み、BMIに応じてモーフ(痩せ→太り)を連続的に動かす。

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0.1, 5.2);

const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
stage.appendChild(renderer.domElement);

// 照明
scene.add(new THREE.HemisphereLight(0xcfe0f0, 0x202a33, 1.0));
const key = new THREE.DirectionalLight(0xffffff, 1.8);
key.position.set(3, 5, 5);
scene.add(key);
const fill = new THREE.DirectionalLight(0xfff0e0, 0.6);
fill.position.set(-3, 1, 4);
scene.add(fill);
const rim = new THREE.DirectionalLight(0x6fe0d4, 0.7);
rim.position.set(-4, 3, -5);
scene.add(rim);

// 回転操作
const controls = new OrbitControls(camera, renderer.domElement);
controls.enablePan = false;
controls.enableZoom = false;
controls.minPolarAngle = Math.PI * 0.30;
controls.maxPolarAngle = Math.PI * 0.62;
controls.target.set(0, -0.1, 0);
controls.autoRotate = true;
controls.autoRotateSpeed = 1.0;
controls.update();
renderer.domElement.addEventListener('pointerdown', ()=>{ controls.autoRotate = false; });

// ====== モデル読み込み ======
let morphMesh = null;      // モーフを持つメッシュ
let morphIndex = 0;        // モーフのインデックス
let modelReady = false;

const loader = new GLTFLoader();
loader.load('body.glb', (gltf)=>{
  const root = gltf.scene;

  // モーフを持つメッシュを探す。持たないメッシュ(余分なfat)は隠す。
  root.traverse(obj=>{
    if(obj.isMesh){
      if(obj.morphTargetInfluences && obj.morphTargetInfluences.length > 0){
        morphMesh = obj;
        morphIndex = 0;
      } else {
        obj.visible = false; // モーフなしメッシュ(重複)は非表示
      }
    }
  });

  // モデルの中心と大きさを測って、画面にちょうど収める
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 3.4 / maxDim;            // 高さを画面に合わせる
  root.scale.setScalar(scale);
  root.position.sub(center.multiplyScalar(scale));
  root.position.y += 0.1;

  scene.add(root);
  modelReady = true;
  render();
}, undefined, (err)=>{
  // 読み込み失敗時はステージにメッセージ
  stage.insertAdjacentHTML('beforeend',
    '<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#8a99a8;font-size:.85rem;text-align:center;padding:20px;">モデルを読み込めませんでした。<br>body.glb が同じフォルダにあるか確認してください。</div>');
  console.error('GLB load error:', err);
});

// BMI → モーフ量(0=痩せ, 1=太り)。痩せ版がBMI16、太り版がBMI35相当として補間。
function bmiToMorph(bmi){
  const t = (bmi - 16) / (35 - 16);
  return Math.max(0, Math.min(1, t));
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

  // モーフ量を更新
  if(modelReady && morphMesh){
    morphMesh.morphTargetInfluences[morphIndex] = bmiToMorph(bmi);
  }

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
