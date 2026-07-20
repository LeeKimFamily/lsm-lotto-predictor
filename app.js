// app.js
let lottoData = [];

async function processData() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) return alert('분석할 파일을 선택해 주세요.');

    document.getElementById('status').innerText = '데이터 읽는 중...';

    try {
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data, { type: 'array' });
            const sheet = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
            
            lottoData = [];
            for (let i = 1; i < sheet.length; i++) {
                const row = sheet[i];
                if (!row || row.length < 7) continue;

                const round = row[0];
                const nums = row.slice(1, 7).map(Number).sort((a, b) => a - b);

                if (!isNaN(round) && nums.every(n => !isNaN(n) && n >= 1 && n <= 45)) {
                    lottoData.push({
                        round: round,
                        numbers: nums,
                        dist: Utils.getDistribution(nums),
                        sum: nums.reduce((a, b) => a + b, 0)
                    });
                }
            }
        } 
        else if (file.name.endsWith('.json')) {
            const text = await file.text();
            lottoData = rawData.map(item => {
                const nums = item.번호.sort((a, b) => a - b);
                return {
                    round: item.회차,
                    numbers: nums,
                    dist: Utils.getDistribution(nums),
                    sum: item.합계
                };
            });
        }

        if (lottoData.length === 0) {
            document.getElementById('status').innerText = '유효한 데이터가 없습니다.';
            return;
        }

        // 회차 기준 정렬 (과거 -> 최신순)
        lottoData.sort((a, b) => a.round - b.round);

        // 디버깅 로그 출력
        const lastItem = lottoData[lottoData.length - 1];
        console.log("최근 회차:", lastItem.round, "번호:", lastItem.numbers, "분포:", lastItem.dist);

        // 연동 화면 그리기
        const stats = Analyzer.analyze(lottoData);
        let finalHtml = Analyzer.render(stats);

        const transitions = Distribution.analyzeTransitions(lottoData);
        const lastDist = lottoData[lottoData.length - 1].dist;
        finalHtml += Distribution.renderUI(transitions, lastDist);

        finalHtml += TrendAnalyzer.renderTrend(lottoData);

        const matches = PastAnalyzer.findMatches(lottoData, lastDist);
        finalHtml += PastAnalyzer.renderMatches(matches);

        const prediction = Predictor.predictNext(lottoData, transitions);
        finalHtml += Predictor.renderPrediction(prediction);

        document.getElementById('status').innerHTML = finalHtml;
        
        // 분석 성공 시 번호 생성 영역 노출
        document.getElementById('actionBox').style.display = 'block';

    } catch (error) {
        console.error(error);
        document.getElementById('status').innerText = '파일 처리 중 오류: ' + error.message;
    }
}

// 번호 생성 실행 메인 함수 (STEP 6, 7, 8 결합)
// app.js
function runGenerator() {
    if (lottoData.length === 0) return alert('데이터를 먼저 로드해 주세요.');

    const transitions = Distribution.analyzeTransitions(lottoData);
    const lastDist = lottoData[lottoData.length - 1].dist;
    
    // 1. 다음 회차 출현 확률이 높은 TOP 5 패턴 추출
    const top5Predictions = Distribution.getNextProbabilities(transitions, lastDist).slice(0, 5);
    
    if (top5Predictions.length === 0) return alert('예측 가능한 패턴이 부족합니다.');

    let gameResults = [];

    // 2. 각 패턴별로 1게임씩 생성
    top5Predictions.forEach((pred, idx) => {
        let bestNums = [];
        let bestScore = -1;

        // 해당 패턴(pred.dist)으로 500번 시뮬레이션하여 가장 좋은 조합 1개 선정
        for (let i = 0; i < 500; i++) {
            let candidate = Generator.generateByDist(pred.dist);
            let score = AIEvaluator.evaluate(candidate);
            if (score > bestScore) {
                bestScore = score;
                bestNums = candidate;
            }
        }
        
        const historyStats = Validator.checkHistory(bestNums, lottoData);
        gameResults.push({ 
            nums: bestNums, 
            score: bestScore, 
            dist: pred.dist, // 어떤 패턴인지 표시
            prob: pred.prob, // 확률 정보
            history: historyStats 
        });
    });

    renderGeneratorResults(gameResults);
}

// app.js의 renderGeneratorResults 함수 수정
function renderGeneratorResults(results) {
    // 분포 코드를 사람이 읽기 쉬운 설명으로 변환하는 함수
    const getDistLabel = (distStr) => {
        const counts = distStr.split('-');
        const labels = ['1~9', '10대', '20대', '30대', '40대'];
        return labels.map((label, i) => `${label}:${counts[i]}개`).join(', ');
    };

    let html = `
        <div class="box" style="border: 2px solid #2ecc71;">
            <h3>[AI 추천 번호 5게임 - 상위 5개 패턴 적용]</h3>
            <table style="width:100%; text-align:left;">
                <tr>
                    <th>순위</th>
                    <th>분포 패턴</th>
                    <th>상세 구성</th>
                    <th>추천 번호</th>
                </tr>
                ${results.map((r, i) => `
                    <tr>
                        <td style="text-align:center;">${i + 1}순위</td>
                        <td style="color:#e67e22; font-weight:bold;">${r.dist}</td>
                        <td style="font-size: 0.85em;">${getDistLabel(r.dist)}</td>
                        <td>
                            <b>${r.nums.join(', ')}</b>
                            <button onclick="copyToClipboard('${r.nums.join(', ')}')">복사</button>
                        </td>
                    </tr>
                `).join('')}
            </table>
        </div>
    `;
    document.getElementById('generatorResults').innerHTML = html;
}

// 클립보드 복사 함수 추가
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert("번호가 복사되었습니다: " + text);
    }).catch(err => {
        alert("복사에 실패했습니다.");
    });
}

async function autoLoadFiles() {
    const filesToTry = ['lotto_data.json']; // 찾을 파일 목록
    
    for (let fileName of filesToTry) {
        try {
            const response = await fetch(`./${fileName}`);
            if (response.ok) {
                console.log(`${fileName} 파일을 찾았습니다! 분석을 시작합니다.`);
                
                // 파일 종류에 따른 처리
                if (fileName.endsWith('.json')) {
                    const data = await response.json();
                    lottoData = data; // lottoData에 할당
                } else if (fileName.endsWith('.xml')) {
                    const text = await response.text();
                    // 여기서 XML 파싱 로직 추가 필요 (엑셀/JSON과 다름)
                    console.warn("XML 파싱은 별도 구현이 필요합니다.");
                    continue; 
                }
                
                // 데이터 로드 후 분석 실행
                processDataAutomatically(); 
                return; // 하나라도 성공하면 종료
            }
        } catch (err) {
            console.log(`${fileName} 파일이 없습니다.`);
        }
    }
    alert("lotto.json 파일을 찾을 수 없습니다. 수동 업로드를 사용하세요.");
}

// app.js의 processDataAutomatically 함수 수정
function processDataAutomatically() {

    lottoData.sort((a, b) => a.round - b.round);
    
    // 1~5 단계 분석 (기존 코드 유지)
    const stats = Analyzer.analyze(lottoData);
    let finalHtml = Analyzer.render(stats);

    // [핵심 디버깅] 패턴 전이 확률 분석 및 '진짜' 마지막 회차 데이터 추출
    const transitions = Distribution.analyzeTransitions(lottoData);
    
    // lottoData가 정렬되었으므로 맨 마지막 원소가 가장 최신 회차(예: 1233회차)입니다.
    const lastRoundData = lottoData[lottoData.length - 1]; 
    const lastDist = lastRoundData.dist;
    
    console.log(`최신 데이터 확인 - 회차: ${lastRoundData.round}, 패턴: ${lastDist}`);

    finalHtml += Distribution.renderUI(transitions, lastDist);
    finalHtml += TrendAnalyzer.renderTrend(lottoData);

    const matches = PastAnalyzer.findMatches(lottoData, lastDist);
    finalHtml += PastAnalyzer.renderMatches(matches);

    const prediction = Predictor.predictNext(lottoData, transitions);
    finalHtml += Predictor.renderPrediction(prediction);

    // ---------------------------------------------------------------
    // 💡 [핵심 알고리즘] 이번 회차 패턴(lastDist)의 '다음 회차들'만 추적!
    // 과거부터가 아닌 최신 회차일수록 압도적인 점수(가중치)를 부여하여 정렬합니다.
    // ---------------------------------------------------------------
    const nextPatternScoreMap = {};
    const totalRounds = lottoData.length;

    // 전체 데이터를 돌면서 현재 최신 패턴(lastDist)과 일치하는 과거 회차를 찾습니다.
    for (let i = 0; i < lottoData.length - 1; i++) {
        if (lottoData[i].dist === lastDist) {
            // 해당 과거 회차의 '바로 다음 회차' 패턴 추출
            const nextPattern = lottoData[i + 1].dist;
            
            // if (nextPattern === lastDist) continue;
            // 🎯 [최신순 점수 정렬 핵심] 
            // i가 클수록(즉, 최신 회차에 가까운 매칭일수록) 가중치 점수가 매우 높게 부여됩니다.
            // 옛날 45회차 뒤에 붙은 다음 패턴보다, 최근 1230회차 뒤에 붙은 다음 패턴이 엄청난 점수를 받음.
            const recencyWeight = (i + 1) / totalRounds;
            
            nextPatternScoreMap[nextPattern] = (nextPatternScoreMap[nextPattern] || 0) + recencyWeight;
        }
    }

    // 가중치 점수가 가장 높은 순(최신부터 정렬)으로 상위 5개 패턴 추출
    let top5Patterns = Object.keys(nextPatternScoreMap)
        .sort((a, b) => nextPatternScoreMap[b] - nextPatternScoreMap[a]) // 최신 가중치 점수 높은 순 정렬
        .slice(0, 5);
    
    // 안전장치: 만약 매칭 데이터가 아예 없는 경우 기본 탑 5 패턴 부여
    if (top5Patterns.length === 0) {
        top5Patterns = ['1-2-1-1-1', '1-1-2-1-1', '2-1-1-1-1', '1-1-1-2-1', '1-1-1-1-2'];
    }
    
    console.log(`🔥 현재 패턴 [${lastDist}]의 다음 회차들 중 최신순 가중치 정렬 TOP 5:`, top5Patterns);

    // index.html의 입력창에 쉼표로 연결해서 최종 주입
    if (document.getElementById('patternInput')) {
        document.getElementById('patternInput').value = top5Patterns.join(', ');
    }

    // 결과 반영 및 액션박스 노출
    document.getElementById('status').innerHTML = finalHtml;
    document.getElementById('actionBox').style.display = 'block';
}

// app.js의 window.onload 부분
window.onload = async () => {
    try {
        // 'lotto.json' 대신 'lotto_data.json'으로 변경
        const response = await fetch('./lotto_data.json'); 
        
        if (!response.ok) throw new Error('파일을 찾을 수 없습니다.');
        
        const rawData = await response.json();
        lottoData = rawData.map(item => ({
            round: item.회차,
            numbers: item.번호.sort((a, b) => a - b),
            dist: Utils.getDistribution(item.번호),
            sum: item.합계
        }));

        processDataAutomatically(); 
    } catch (e) {
        console.error("자동 로드 오류:", e);
        document.getElementById('status').innerText = '데이터를 자동으로 불러올 수 없습니다. 수동 업로드를 이용하세요.';
    }
};

function runCustomGenerator() {
    const input = document.getElementById('patternInput').value;
    if (!input) return alert('패턴을 입력해주세요.');

    const patterns = input.split(',').map(p => p.trim());
    let finalResults = [];

    // 💡 [핵심 성능 최적화] 역대 당첨 번호들을 '1,5,12,23,34,45' 형태의 문자열 세트로 미리 빠르게 변환합니다.
    const historicalSet = new Set();
    if (lottoData && Array.isArray(lottoData)) {
        lottoData.forEach(item => {
            if (item.numbers && Array.isArray(item.numbers)) {
                // 오름차순 정렬된 번호들을 쉼표로 이어 붙여서 고유 지문(Key) 생성
                const sortedKey = [...item.numbers].sort((a, b) => a - b).join(',');
                historicalSet.add(sortedKey);
            }
        });
    }

    console.log(`[중복 필터 활성화] 역대 당첨 데이터 ${historicalSet.size개}를 대조하여 중복을 차단합니다.`);

    patterns.forEach(pattern => {
        let bestNums = [];
        let bestScore = -1;
        let foundValidCandidate = false;

        // 해당 패턴당 최대 500번 시뮬레이션 (과거 당첨 번호와 겹치지 않는 유효한 조합을 찾을 때까지)
        for (let i = 0; i < 500; i++) {
            let candidate = Generator.generateByDist(pattern);
            if (!candidate || candidate.length !== 6) continue;

            // 후보 번호도 정렬 후 문자열 지문 생성
            const candidateKey = [...candidate].sort((a, b) => a - b).join(',');

            // 🛑 [중복 검사 필터] 만약 역대 당첨된 적이 있는 조합이라면 과감하게 버림(continue)!
            if (historicalSet.has(candidateKey)) {
                continue; 
            }

            let score = AIEvaluator.evaluate(candidate);
            
            // 유효한 후보 중 AI 점수가 가장 높은 녀석 채택
            if (score > bestScore) {
                bestScore = score;
                bestNums = candidate;
                foundValidCandidate = true;
            }
        }
        
        // 만약 500번 돌리는 동안 필터에 걸려 적당한 걸 못 찾았을 경우의 안전장치
        if (!foundValidCandidate || bestNums.length === 0) {
            bestNums = Generator.generateByDist(pattern);
        }

        finalResults.push({
            nums: bestNums,
            score: bestScore,
            dist: pattern,
            history: Validator.checkHistory(bestNums, lottoData)
        });
    });

    // 화면에 렌더링
    renderGeneratorResults(finalResults);
}

function tracePatternHistory(targetPattern = '2-0-2-1-1') {
    if (lottoData.length === 0) return alert('데이터를 먼저 로드해 주세요.');

    let html = `
        <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 5px;">
            <h4 style="margin-top:0;">🔍 패턴 [ ${targetPattern} ] 전후 흐름 추적 (이전 - 패턴 - 다음)</h4>
            <table style="width:100%; border-collapse: collapse; text-align: center; font-size: 13px;">
                <thead>
                    <tr style="background:#e9ecef;">
                        <th style="padding:10px; border:1px solid #ccc; background:#f1f3f5;">◀ 이전 회차</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#f1f3f5;">◀ 이전 패턴</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#fff3cd;">🎯 조회 회차</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#fff3cd;">🎯 조회 번호 (패턴)</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#ffd2d2; color: #d9534f;">▶ 다음 회차</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#ffd2d2; color: #d9534f;">▶ 다음 패턴</th>
                        <th style="padding:10px; border:1px solid #ccc;">연속 여부</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let matchCount = 0;

    // 이전 회차(i-1)와 다음 회차(i+1)가 모두 존재해야 하므로 index 1부터 length-2 까지만 돕니다.
    for (let i = 1; i < lottoData.length - 1; i++) {
        if (lottoData[i].dist === targetPattern) {
            matchCount++;
            const prevRound = lottoData[i - 1];    // 이전 회차
            const currentRound = lottoData[i];     // 조회된 패턴 회차
            const nextRound = lottoData[i + 1];    // 다음 회차
            
            // 다음 회차도 패턴이 똑같은지 확인 (연속 여부)
            const isConsecutive = nextRound.dist === targetPattern;
            
            // 다음 회차가 연속이면 행 전체에 약간의 포인트를 줍니다.
            const rowStyle = isConsecutive ? 'background-color: #fff9db;' : '';

            html += `
                <tr style="${rowStyle}">
                    <!-- 이전 회차 정보 -->
                    <td style="padding:10px; border:1px solid #eee; color:#666;">${prevRound.round}회</td>
                    <td style="padding:10px; border:1px solid #eee; color:#666; font-family:monospace;">${prevRound.dist}</td>
                    
                    <!-- 조회 회차 (기준) -->
                    <td style="padding:10px; border:1px solid #eee; font-weight:bold; background:#fffbeb;">${currentRound.round}회</td>
                    <td style="padding:10px; border:1px solid #eee; background:#fffbeb;">
                        ${currentRound.numbers.join(', ')} <b style="color:#555;">(${currentRound.dist})</b>
                    </td>
                    
                    <!-- 다음 회차 정보 -->
                    <td style="padding:10px; border:1px solid #eee; font-weight:bold; color: #d9534f; background:#fff5f5;">${nextRound.round}회</td>
                    <td style="padding:10px; border:1px solid #eee; font-weight:bold; color: #d9534f; font-family:monospace; background:#fff5f5;">${nextRound.dist}</td>
                    
                    <!-- 연속 마크 -->
                    <td style="padding:10px; border:1px solid #eee;">
                        ${isConsecutive ? '<span style="color:red; font-weight:bold;">🔥 연속!</span>' : '<span style="color:#aaa;">❌ 변경</span>'}
                    </td>
                </tr>
            `;
        }
    }

    if (matchCount === 0) {
        html += `<tr><td colspan="7" style="padding:20px; color:#999;">해당 패턴의 데이터가 없습니다.</td></tr>`;
    }

    html += `
                </tbody>
            </table>
            <p style="margin-top:10px; font-size:12px; color:#666; text-align:left;">
                * 총 <b>${matchCount}번</b>의 패턴 출현 기록입니다. 
                오른쪽 <b>[▶ 다음 패턴]</b> 칸에 적힌 녀석들의 통계를 내서 가장 많이 나온 걸 AI가 추천해 주는 원리입니다.
            </p>
        </div>
    `;

    document.getElementById('generatorResults').innerHTML = html;
}