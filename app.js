// --- アプリケーションの状態管理 ---
let depthCanvas, stereogramCanvas, patternCanvas;
let textInput, fontSizeInput, fontSizeVal;
let shapeSizeInput, shapeSizeVal;
let depthUpload, patternUpload, patternUploadContainer;
let generateBtn, saveBtn, clearBtn, instructionsOverlay;

let activeMode = 'text'; // 'text', 'shape', 'upload'
let activeShape = 'star'; // 'star', 'heart', 'circle', 'ring', 'square'

// 立体のもとオブジェクトの定義
let textObject = {
    x: 300,
    y: 200,
    text: 'LOVE',
    fontSize: 80
};

let shapeObject = {
    x: 300,
    y: 200,
    shape: 'star',
    size: 100
};

let uploadedDepthImage = null;
let uploadedPatternImage = null;

// ドラッグ操作用の変数
let isDragging = false;
let dragOffset = { x: 0, y: 0 };

// --- 起動時の初期設定 ---
window.addEventListener('DOMContentLoaded', () => {
    // 要素の取得
    depthCanvas = document.getElementById('depth-canvas');
    stereogramCanvas = document.getElementById('stereogram-canvas');
    patternCanvas = document.getElementById('pattern-canvas');

    textInput = document.getElementById('text-input');
    fontSizeInput = document.getElementById('font-size');
    fontSizeVal = document.getElementById('font-size-val');

    shapeSizeInput = document.getElementById('shape-size');
    shapeSizeVal = document.getElementById('shape-size-val');

    depthUpload = document.getElementById('depth-upload');
    patternUpload = document.getElementById('pattern-upload');
    patternUploadContainer = document.getElementById('pattern-upload-container');

    generateBtn = document.getElementById('generate-btn');
    saveBtn = document.getElementById('save-btn');
    clearBtn = document.getElementById('clear-btn');
    instructionsOverlay = document.getElementById('instructions');

    // 要素の検証
    const requiredElements = {
        depthCanvas, stereogramCanvas, patternCanvas,
        textInput, fontSizeInput, fontSizeVal,
        shapeSizeInput, shapeSizeVal,
        depthUpload, patternUpload, patternUploadContainer,
        generateBtn, saveBtn, clearBtn, instructionsOverlay
    };

    for (const [name, element] of Object.entries(requiredElements)) {
        if (!element) {
            console.error(`エラー: HTML要素 #${name.replace(/[A-Z]/g, m => '-' + m.toLowerCase())} が見つかりません。`);
            return;
        }
    }

    initTabs();
    initEventListeners();
    generateDefaultPattern('dots-bw'); // 初期背景は白黒ドット
    drawDepthMap();
});

// --- タブ切り替え処理 ---
function initTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            tab.classList.add('active');
            const contentId = tab.getAttribute('data-tab');
            const contentEl = document.getElementById(contentId);
            if (contentEl) {
                contentEl.classList.add('active');
            }
            
            // アクティブモードの切り替え
            if (contentId === 'text-tab') {
                activeMode = 'text';
            } else if (contentId === 'shape-tab') {
                activeMode = 'shape';
            } else if (contentId === 'upload-tab') {
                activeMode = 'upload';
            }
            
            drawDepthMap();
        });
    });
}

// --- イベントリスナーの登録 ---
function initEventListeners() {
    // 文字入力の変更
    textInput.addEventListener('input', (e) => {
        textObject.text = e.target.value || ' ';
        drawDepthMap();
    });
    
    // フォントサイズの変更
    fontSizeInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        textObject.fontSize = val;
        fontSizeVal.textContent = `${val}px`;
        drawDepthMap();
    });
    
    // 図形の変更
    const shapeBtns = document.querySelectorAll('.shape-btn');
    shapeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            shapeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeShape = btn.getAttribute('data-shape');
            shapeObject.shape = activeShape;
            drawDepthMap();
        });
    });
    
    // 図形サイズの変更
    shapeSizeInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        shapeObject.size = val;
        shapeSizeVal.textContent = `${val}px`;
        drawDepthMap();
    });
    
    // クリアボタン
    clearBtn.addEventListener('click', () => {
        if (activeMode === 'text') {
            textInput.value = '';
            textObject.text = '';
        } else if (activeMode === 'upload') {
            uploadedDepthImage = null;
            depthUpload.value = '';
        }
        drawDepthMap();
    });
    
    // 3D画像作成ボタン
    generateBtn.addEventListener('click', () => {
        generateStereogram();
    });
    
    // 保存ボタン
    saveBtn.addEventListener('click', () => {
        console.log("SAVE_CLICKED");
        saveStereogram();
    });
    
    // 立体もと画像の読み込み
    depthUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    uploadedDepthImage = img;
                    drawDepthMap();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });


    // 背景パターンのラジオボタン選択
    const patternRadios = document.querySelectorAll('input[name="pattern-type"]');
    patternRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const type = e.target.value;
            if (type === 'image') {
                patternUploadContainer.classList.remove('hidden');
                if (uploadedPatternImage) {
                    drawPatternImage(uploadedPatternImage);
                }
            } else {
                patternUploadContainer.classList.add('hidden');
                generateDefaultPattern(type);
            }
        });
    });

    // 背景画像の読み込み
    patternUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    uploadedPatternImage = img;
                    drawPatternImage(img);
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // --- ドラッグ＆ドロップ（キャンバス操作）の処理 ---
    
    // マウス／タッチイベントの取得共通関数
    function getPointerPos(e) {
        const rect = depthCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (depthCanvas.width / rect.width),
            y: (clientY - rect.top) * (depthCanvas.height / rect.height)
        };
    }
    
    function startDrag(e) {
        if (activeMode === 'upload') return;
        
        const pos = getPointerPos(e);
        const target = activeMode === 'text' ? textObject : shapeObject;
        
        // オブジェクトとの距離を測る
        const dx = pos.x - target.x;
        const dy = pos.y - target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // 文字または図形の近くをクリックした場合はドラッグ開始
        const hitRadius = activeMode === 'text' ? textObject.fontSize : shapeObject.size / 2;
        if (distance < hitRadius + 20) {
            isDragging = true;
            dragOffset.x = dx;
            dragOffset.y = dy;
            e.preventDefault(); // タッチ操作での画面スクロールを防ぐ
        }
    }
    
    function doDrag(e) {
        if (!isDragging) return;
        
        const pos = getPointerPos(e);
        const target = activeMode === 'text' ? textObject : shapeObject;
        
        target.x = Math.max(0, Math.min(depthCanvas.width, pos.x - dragOffset.x));
        target.y = Math.max(0, Math.min(depthCanvas.height, pos.y - dragOffset.y));
        
        drawDepthMap();
        e.preventDefault();
    }
    
    function stopDrag() {
        isDragging = false;
    }
    
    // マウス操作
    depthCanvas.addEventListener('mousedown', startDrag);
    window.addEventListener('mousemove', doDrag);
    window.addEventListener('mouseup', stopDrag);
    
    // タッチ操作（スマートフォン用）
    depthCanvas.addEventListener('touchstart', startDrag, { passive: false });
    window.addEventListener('touchmove', doDrag, { passive: false });
    window.addEventListener('touchend', stopDrag);
}

// --- 背景パターンの生成・描画 ---

// 砂嵐（ランダムドット）パターンの生成
function generateDefaultPattern(type) {
    const ctx = patternCanvas.getContext('2d');
    const w = patternCanvas.width;
    const h = patternCanvas.height;
    ctx.clearRect(0, 0, w, h);
    
    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;
    
    for (let i = 0; i < data.length; i += 4) {
        if (type === 'dots-bw') {
            // 白黒ドット
            const color = Math.random() > 0.5 ? 255 : 0;
            data[i] = color;     // R
            data[i + 1] = color; // G
            data[i + 2] = color; // B
            data[i + 3] = 255;   // A
        } else {
            // カラフルドット
            data[i] = Math.floor(Math.random() * 256);     // R
            data[i + 1] = Math.floor(Math.random() * 256); // G
            data[i + 2] = Math.floor(Math.random() * 256); // B
            data[i + 3] = 255;                             // A
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

// アップロードされた画像をパターンキャンバスに描く
function drawPatternImage(img) {
    const ctx = patternCanvas.getContext('2d');
    const w = patternCanvas.width;
    const h = patternCanvas.height;
    ctx.clearRect(0, 0, w, h);
    
    // アスペクト比を維持しながら正方形のパターンエリアいっぱいに描く
    const scale = Math.max(w / img.width, h / img.height);
    const x = (w - img.width * scale) / 2;
    const y = (h - img.height * scale) / 2;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
}

// --- 立体のもと（デプスマップ）の描画 ---
function drawDepthMap() {
    const ctx = depthCanvas.getContext('2d');
    const w = depthCanvas.width;
    const h = depthCanvas.height;
    
    // 背景は奥なので真っ黒 (#000000)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    
    ctx.save();
    
    // 3Dが滑らかに見えるように、境界線をぼかします（影効果を使用）
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12; // ぼかし幅
    ctx.fillStyle = '#ffffff'; // 立体部分は白 (#ffffff)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    
    if (activeMode === 'text') {
        if (textObject.text.trim() !== '') {
            ctx.font = `bold ${textObject.fontSize}px 'Outfit', 'Inter', 'Noto Sans JP', sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(textObject.text, textObject.x, textObject.y);
        }
    } else if (activeMode === 'shape') {
        drawShape(ctx, shapeObject.shape, shapeObject.x, shapeObject.y, shapeObject.size);
    } else if (activeMode === 'upload') {
        if (uploadedDepthImage) {
            // アップロード画像の場合は、元画像の濃淡を活かすためぼかしをオフにします
            ctx.shadowBlur = 0;
            const hRatio = w / uploadedDepthImage.width;
            const vRatio = h / uploadedDepthImage.height;
            const ratio = Math.min(hRatio, vRatio);
            const x = (w - uploadedDepthImage.width * ratio) / 2;
            const y = (h - uploadedDepthImage.height * ratio) / 2;
            ctx.drawImage(uploadedDepthImage, x, y, uploadedDepthImage.width * ratio, uploadedDepthImage.height * ratio);
        } else {
            // 画像がないときはヘルプメッセージをキャンバス内に描画
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#888888';
            ctx.font = "16px 'Inter', sans-serif";
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("画像を読み込むとここに表示されます", w / 2, h / 2);
        }
    }
    
    ctx.restore();
}

// 様々な図形を描画するヘルパー関数
function drawShape(ctx, shape, x, y, size) {
    ctx.beginPath();
    switch (shape) {
        case 'circle': // 円
            ctx.arc(x, y, size / 2, 0, Math.PI * 2);
            ctx.fill();
            break;
            
        case 'ring': // 二重丸（リング）
            ctx.arc(x, y, size / 2, 0, Math.PI * 2);
            ctx.fill();
            // 内側を少し細い黒でくり抜くことでリングにする
            ctx.save();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(x, y, size / 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            break;
            
        case 'square': // 四角
            ctx.rect(x - size / 2, y - size / 2, size, size);
            ctx.fill();
            break;
            
        case 'star': // 五角形の星
            const spikes = 5;
            const outerRadius = size / 2;
            const innerRadius = size / 5;
            let rot = Math.PI / 2 * 3;
            let cx = x;
            let cy = y;
            let step = Math.PI / spikes;

            ctx.moveTo(cx, cy - outerRadius);
            for (let i = 0; i < spikes; i++) {
                cx = x + Math.cos(rot) * outerRadius;
                cy = y + Math.sin(rot) * outerRadius;
                ctx.lineTo(cx, cy);
                rot += step;

                cx = x + Math.cos(rot) * innerRadius;
                cy = y + Math.sin(rot) * innerRadius;
                ctx.lineTo(cx, cy);
                rot += step;
            }
            ctx.lineTo(x, y - outerRadius);
            ctx.closePath();
            ctx.fill();
            break;
            
        case 'heart': // ハート型
            const width = size;
            const height = size;
            ctx.save();
            ctx.translate(x, y - height / 4);
            ctx.moveTo(0, 0);
            // 左半分
            ctx.bezierCurveTo(-width / 2, -height / 2, -width, 0, 0, height / 2);
            // 右半分
            ctx.bezierCurveTo(width, 0, width / 2, -height / 2, 0, 0);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            break;
    }
}

// --- ステレオグラム自動生成（SIRDSアルゴリズム） ---
function generateStereogram() {
    const w = depthCanvas.width;
    const h = depthCanvas.height;
    
    // デプスマップ（立体のもと）のデータを取得
    const depthCtx = depthCanvas.getContext('2d');
    const depthData = depthCtx.getImageData(0, 0, w, h).data;
    
    // 出力用ステレオグラム
    const stereoCtx = stereogramCanvas.getContext('2d');
    const stereoData = stereoCtx.createImageData(w, h);
    const outData = stereoData.data;
    
    // 背景パターンのデータを取得
    const patternCtx = patternCanvas.getContext('2d');
    const pw = patternCanvas.width;
    const ph = patternCanvas.height;
    const patternData = patternCtx.getImageData(0, 0, pw, ph).data;
    
    // パラメータ調整
    const eyeSeparation = 130; // パターンの繰り返し幅（ピクセル）
    const depthFactor = 0.35;  // 飛び出し具合の強度（最大35%縮める）
    
    // 奥行き値を取得するヘルパー (0.0=奥、1.0=一番手前)
    function getDepth(x, y) {
        if (x < 0) x = 0; if (x >= w) x = w - 1;
        if (y < 0) y = 0; if (y >= h) y = h - 1;
        
        const idx = (y * w + x) * 4;
        const r = depthData[idx];
        const g = depthData[idx + 1];
        const b = depthData[idx + 2];
        
        // 輝度（明るさ）を計算して 0.0 ~ 1.0 に正規化
        return ((r + g + b) / 3) / 255.0;
    }
    
    // 行ごとにステレオグラムの計算を行う
    for (let y = 0; y < h; y++) {
        // 同値関係を保持する配列 (same[x] = 同じ色にすべき左側のピクセルインデックス)
        const same = new Int32Array(w);
        for (let x = 0; x < w; x++) {
            same[x] = x;
        }
        
        // 1. 同値グループの関係（リンク）を構築
        for (let x = 0; x < w; x++) {
            const z = getDepth(x, y); // 0.0 ~ 1.0
            
            // 目の分離幅 (飛び出し度に応じてピッチを狭くする)
            const sep = Math.round((1.0 - z * depthFactor) * eyeSeparation);
            
            const left = Math.floor(x - sep / 2);
            const right = left + sep;
            
            if (left >= 0 && right < w) {
                // Union-Find (同値グループの連結処理)
                let l = left;
                while (same[l] !== l) l = same[l];
                let r = right;
                while (same[r] !== r) r = same[r];
                
                if (l !== r) {
                    if (l < r) {
                        same[r] = l;
                    } else {
                        same[l] = r;
                    }
                }
            }
        }
        
        // 2. 構築したグループごとに色を設定していく
        const colors = {}; // 親ピクセルの色キャッシュ
        
        for (let x = 0; x < w; x++) {
            // ルート（グループの親）を見つける
            let root = x;
            while (same[root] !== root) root = same[root];
            
            if (!colors[root]) {
                // 親ピクセルの色が未定の場合、背景パターンからサンプリングして色を決める
                const px = root % pw;
                const py = y % ph;
                const pIdx = (py * pw + px) * 4;
                
                colors[root] = {
                    r: patternData[pIdx],
                    g: patternData[pIdx + 1],
                    b: patternData[pIdx + 2],
                    a: patternData[pIdx + 3]
                };
            }
            
            // ピクセルに色を適用
            const outIdx = (y * w + x) * 4;
            outData[outIdx] = colors[root].r;
            outData[outIdx + 1] = colors[root].g;
            outData[outIdx + 2] = colors[root].b;
            outData[outIdx + 3] = colors[root].a;
        }
    }
    
    // 生成された画像データをキャンバスに描画
    stereoCtx.putImageData(stereoData, 0, 0);
    
    // プレビューの案内を非表示にし、保存ボタンを使えるようにする
    instructionsOverlay.style.opacity = '0';
    saveBtn.disabled = false;
}

// --- 画像の保存機能 ---
function saveStereogram() {
    const link = document.createElement('a');
    link.download = 'stereogram.png';
    link.href = stereogramCanvas.toDataURL('image/png');
    link.click();
}
