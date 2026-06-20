(function(){
  // ===== 設定：画像セット（あとで差し替え可能） =====
  // 各BMIレンジに対応する画像ファイル名。女性向けにする場合はfileを差し替える。
  const IMG_SET = [
    {key:18, file:'images/bmi_18.png', range:'BMI 18.5–21',  lo:0,    hi:21.0 },
    {key:22, file:'images/bmi_22.png', range:'BMI 21.1–24',  lo:21.01,hi:24.0 },
    {key:25, file:'images/bmi_25.png', range:'BMI 24.1–28',  lo:24.01,hi:28.0 },
    {key:30, file:'images/bmi_30.png', range:'BMI 28.1–33',  lo:28.01,hi:33.0 },
    {key:35, file:'images/bmi_35.png', range:'BMI 33.1–',    lo:33.01,hi:999 },
  ];

  // ===== 医療的な肥満度分類（日本肥満学会基準） =====
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
  const stageTag = $('stageTag'), bodyImg = $('bodyImg'), targetMsg = $('targetMsg');

  let currentFile = null; // 同じ画像の再読み込みを防ぐ

  function pickImage(bmi){
    return IMG_SET.find(s => bmi >= s.lo && bmi <= s.hi) || IMG_SET[IMG_SET.length-1];
  }

  // スケールバー上の位置：BMI 15〜40 を 0〜100% にマッピング
  function bmiToPercent(bmi){
    const pct = (bmi - 15) / (40 - 15) * 100;
    return Math.max(0, Math.min(100, pct));
  }

  function updateSliderFill(){
    const v = parseFloat(slider.value);
    const pct = (v - slider.min) / (slider.max - slider.min) * 100;
    slider.style.setProperty('--fill', pct + '%');
  }

  function render(){
    const h = parseFloat(height.value);
    const w = parseFloat(weight.value);
    updateSliderFill();
    if(!h || !w || h <= 0){ return; }

    const bmi = w / Math.pow(h/100, 2);
    const bmiR = Math.round(bmi * 10) / 10;

    bmiNumber.textContent = bmiR.toFixed(1);
    const cat = classify(bmi);
    categoryPill.textContent = cat.name;
    categoryPill.style.background = cat.color;
    categoryPill.style.color = '#0f1419';

    // スケール上のマーカー
    markerDot.style.left = bmiToPercent(bmi) + '%';

    // 体型イメージの切り替え（ファイルが変わったときだけ差し替え）
    const img = pickImage(bmi);
    stageTag.textContent = img.range;
    if(img.file !== currentFile){
      currentFile = img.file;
      bodyImg.src = img.file;
    }

    // 美容体重の行ハイライト
    document.querySelectorAll('.ref-row').forEach(row=>{
      const lo = parseFloat(row.dataset.lo), hi = parseFloat(row.dataset.hi);
      row.classList.toggle('active', bmi >= lo && bmi <= hi);
    });

    // 目標までのメッセージ（標準体重BMI22との差）
    const standardW = 22 * Math.pow(h/100, 2);
    const diff = w - standardW;
    if(Math.abs(diff) < 0.5){
      targetMsg.innerHTML = '今の体重は標準体重（BMI22）とほぼ同じです。';
    } else if(diff > 0){
      const beautyDiff = w - 20*Math.pow(h/100,2);
      targetMsg.innerHTML = `標準体重（BMI22）まであと <b>${diff.toFixed(1)} kg</b>。美容体重（BMI20）なら <b>${beautyDiff.toFixed(1)} kg</b> 減が目安です。`;
    } else {
      targetMsg.innerHTML = `標準体重（BMI22）より <b>${Math.abs(diff).toFixed(1)} kg</b> 軽い状態です。`;
    }
  }

  // スライダー → 体重入力欄
  slider.addEventListener('input', ()=>{
    weight.value = parseFloat(slider.value).toFixed(1);
    sliderVal.textContent = parseFloat(slider.value).toFixed(1) + ' kg';
    render();
  });
  // 体重入力欄 → スライダー
  weight.addEventListener('input', ()=>{
    const v = parseFloat(weight.value);
    if(!isNaN(v)){
      slider.value = Math.max(slider.min, Math.min(slider.max, v));
      sliderVal.textContent = v.toFixed(1) + ' kg';
    }
    render();
  });
  height.addEventListener('input', render);

  render();
})();
