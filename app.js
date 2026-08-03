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

// 🎯 [과거 미출현 전환 패턴 전용]
// 최근 500회차 동안 현재 패턴(A) 직후에 단 한 번도 나오지 않았던 '신규 전환 패턴' TOP 10 추출
function processDataAutomatically() {
    lottoData.sort((a, b) => a.round - b.round);
    
    const stats = Analyzer.analyze(lottoData);
    let finalHtml = Analyzer.render(stats);

    const transitions = Distribution.analyzeTransitions(lottoData);
    
    // 가장 최신 회차 데이터 추출 (A 패턴)
    const lastRoundData = lottoData[lottoData.length - 1]; 
    const lastDist = lastRoundData.dist; 
    
    console.log(`최신 회차 [${lastRoundData.round}회] 당첨 패턴 (A): ${lastDist}`);

    finalHtml += Distribution.renderUI(transitions, lastDist);
    finalHtml += TrendAnalyzer.renderTrend(lottoData);

    const matches = PastAnalyzer.findMatches(lottoData, lastDist);
    finalHtml += PastAnalyzer.renderMatches(matches);

    const prediction = Predictor.predictNext(lottoData, transitions);
    finalHtml += Predictor.renderPrediction(prediction);

    // 💡 [패턴 검증] 한 자리에 3개 이상 쏠리는 패턴은 차단 (최대 2개 제한)
    function isValidPatternFormat(patternStr) {
        if (!patternStr) return false;
        const counts = patternStr.split('-').map(Number);
        for (let count of counts) {
            if (count > 2) return false; 
        }
        return true;
    }

    // ---------------------------------------------------------------
    // 🛑 [최근 500회차 기준 - '현재 패턴 직후 출현 기록 0회' 패턴 추적]
    // ---------------------------------------------------------------
    const RECENT_LIMIT = 500;
    const recentData = lottoData.slice(-RECENT_LIMIT); 

    // 과거 현재 패턴(A) 바로 다음에 나왔던 패턴들(B) 수집
    const appearedAfterLastDist = new Set(); 
    
    for (let i = 0; i < recentData.length - 1; i++) {
        if (recentData[i].dist === lastDist) {
            appearedAfterLastDist.add(recentData[i + 1].dist); 
        }
    }

    console.log(`🛑 [과거에 등장했던 패턴들 (제외 대상)]`, Array.from(appearedAfterLastDist));

    // 최근 500회차 전체에서 등장했던 모든 유효 패턴 모음 (기본 출현 빈도가 있는 패턴 우선 고려)
    const overallPatternWeight = {};
    for (let i = 0; i < recentData.length; i++) {
        const p = recentData[i].dist;
        if (isValidPatternFormat(p)) {
            overallPatternWeight[p] = (overallPatternWeight[p] || 0) + (i + 1);
        }
    }

    // 🔥 핵심 조건: 현재 패턴(A) 다음에 '단 한 번도 나온 적 없는(0회)' 패턴만 필터링
    const unappearedPatterns = Object.keys(overallPatternWeight).filter(p => {
        // 1. 현재 패턴 자체(A) 제외
        if (p === lastDist) return false;
        // 2. 과거에 직후 등장한 적 있는 패턴(B) 제외 (출현 이력 있으면 삭제!)
        if (appearedAfterLastDist.has(p)) return false;
        // 3. 자리당 3개 이상 쏠림 패턴 제외
        if (!isValidPatternFormat(p)) return false;
        
        return true;
    });

    // 전체 출현 빈도 가중치 순으로 정렬하여 상위 10개 추출
    let top10Patterns = unappearedPatterns
        .sort((a, b) => overallPatternWeight[b] - overallPatternWeight[a])
        .slice(0, 10);

    // 💡 만약 미출현 패턴 후보가 10개 미만일 경우 예비 패턴 풀에서 추가 보충
    if (top10Patterns.length < 10) {
        const defaultPool = [
            '1-2-1-1-1', '1-1-2-1-1', '2-1-1-1-1', '1-1-1-2-1', '1-1-1-1-2',
            '2-0-2-1-1', '1-2-0-2-1', '2-1-0-2-1', '1-0-2-2-1', '2-2-0-1-1',
            '0-2-2-1-1', '1-0-2-1-2', '2-1-1-0-2', '1-2-1-0-2', '2-0-1-2-1'
        ];

        for (let p of defaultPool) {
            if (p !== lastDist && !appearedAfterLastDist.has(p) && isValidPatternFormat(p) && !top10Patterns.includes(p)) {
                top10Patterns.push(p);
            }
            if (top10Patterns.length >= 10) break;
        }
    }

    console.log(`🔥 [완전 미출현 전이 패턴 TOP 10]`, top10Patterns);

    // index.html 입력창에 자동 주입
    if (document.getElementById('patternInput')) {
        document.getElementById('patternInput').value = top10Patterns.join(', ');
    }

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

    // 과거 당첨 번호 세트
    const historicalSet = new Set();
    if (typeof lottoData !== 'undefined' && Array.isArray(lottoData)) {
        lottoData.forEach(item => {
            if (item.numbers && Array.isArray(item.numbers)) {
                const sortedKey = [...item.numbers].sort((a, b) => a - b).join(',');
                historicalSet.add(sortedKey);
            }
        });
    }

    // 동일 번호대(자리) 최대 2개 제한 검증
    function isMaxTwoPerGroup(numbers) {
        const counts = [0, 0, 0, 0, 0];
        for (let num of numbers) {
            let groupIdx = 0;
            if (num >= 1 && num <= 9) groupIdx = 0;
            else if (num >= 10 && num <= 19) groupIdx = 1;
            else if (num >= 20 && num <= 29) groupIdx = 2;
            else if (num >= 30 && num <= 39) groupIdx = 3;
            else if (num >= 40 && num <= 45) groupIdx = 4;

            counts[groupIdx]++;
            if (counts[groupIdx] > 2) return false;
        }
        return true;
    }

    patterns.forEach(pattern => {
        let bestNums = [];
        let bestScore = -1;
        let foundValidCandidate = false;

        // 💡 시뮬레이션을 돌며 밸런스 조건에 부합하는 번호만 필터링합니다.
        for (let i = 0; i < 2000; i++) {
            let candidate = Generator.generateByDist(pattern);
            if (!candidate || candidate.length !== 6) continue;

            candidate.sort((a, b) => a - b);
            const candidateKey = candidate.join(',');

            // 🛑 [필터 1] 번호대별 최대 2개 제한
            if (!isMaxTwoPerGroup(candidate)) continue;

            // 🛑 [필터 2] 과거 1등 당첨 이력 제외
            if (historicalSet.has(candidateKey)) continue;

            // 🔥 [필터 3] 바로 여기서 호출합니다! (합계, 홀짝, 3연번, 끝자리 검증)
            if (!isValidCombination(candidate)) continue;

            // 모든 필터를 통과한 진짜 알짜배기 조합만 AI 평가
            let score = AIEvaluator.evaluate(candidate);
            
            if (score > bestScore) {
                bestScore = score;
                bestNums = candidate;
                foundValidCandidate = true;
            }
        }
        
        // 예외 처리 (조건이 너무 깐깐해서 안 뽑혔을 경우)
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
                        <th style="padding:10px; border:1px solid #ccc; background:#f1f3f5;">◀ 이전 합계</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#fff3cd;">🎯 조회 회차</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#fff3cd;">🎯 조회 번호 (패턴)</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#fff3cd;">🎯 조회 합계</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#ffd2d2; color: #d9534f;">▶ 다음 회차</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#ffd2d2; color: #d9534f;">▶ 다음 패턴</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#ffd2d2; color: #d9534f;">▶ 다음 합계</th>
                        <th style="padding:10px; border:1px solid #ccc;">연속 여부</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let matchCount = 0;

    // 이전 회차(i-1)와 다음 회차(i+1)가 모두 존재해야 하므로 index 1부터 length-2 까지만 탐색
    for (let i = 1; i < lottoData.length - 1; i++) {
        if (lottoData[i].dist === targetPattern) {
            matchCount++;
            const prevRound = lottoData[i - 1];    // 이전 회차
            const currentRound = lottoData[i];     // 조회된 패턴 회차
            const nextRound = lottoData[i + 1];    // 다음 회차
            
            // 💡 각 회차별 번호 합계 구하기 (문자열 대비 parseInt 적용)
            const prevSum = prevRound.numbers ? prevRound.numbers.reduce((acc, cur) => acc + (parseInt(cur, 10) || 0), 0) : 0;
            const currentSum = currentRound.numbers ? currentRound.numbers.reduce((acc, cur) => acc + (parseInt(cur, 10) || 0), 0) : 0;
            const nextSum = nextRound.numbers ? nextRound.numbers.reduce((acc, cur) => acc + (parseInt(cur, 10) || 0), 0) : 0;

            // 다음 회차도 패턴이 똑같은지 확인 (연속 여부)
            const isConsecutive = nextRound.dist === targetPattern;
            
            // 다음 회차가 연속이면 행 전체 배경색 하이라이트
            const rowStyle = isConsecutive ? 'background-color: #fff9db;' : '';

            html += `
                <tr style="${rowStyle}">
                    <!-- 이전 회차 정보 및 합계 -->
                    <td style="padding:10px; border:1px solid #eee; color:#666;">${prevRound.round}회</td>
                    <td style="padding:10px; border:1px solid #eee; color:#666; font-family:monospace;">${prevRound.dist}</td>
                    <td style="padding:10px; border:1px solid #eee; color:#555; background:#f8f9fa; font-weight:bold;">${prevSum}</td>
                    
                    <!-- 조회 회차 (기준) 및 합계 -->
                    <td style="padding:10px; border:1px solid #eee; font-weight:bold; background:#fffbeb;">${currentRound.round}회</td>
                    <td style="padding:10px; border:1px solid #eee; background:#fffbeb;">
                        ${currentRound.numbers.join(', ')} <b style="color:#555;">(${currentRound.dist})</b>
                    </td>
                    <td style="padding:10px; border:1px solid #eee; font-weight:bold; color:#d97706; background:#fffbeb;">${currentSum}</td>
                    
                    <!-- 다음 회차 정보 및 합계 -->
                    <td style="padding:10px; border:1px solid #eee; font-weight:bold; color: #d9534f; background:#fff5f5;">${nextRound.round}회</td>
                    <td style="padding:10px; border:1px solid #eee; font-weight:bold; color: #d9534f; font-family:monospace; background:#fff5f5;">${nextRound.dist}</td>
                    <td style="padding:10px; border:1px solid #eee; font-weight:bold; color: #d9534f; background:#fff5f5;">${nextSum}</td>
                    
                    <!-- 연속 마크 -->
                    <td style="padding:10px; border:1px solid #eee;">
                        ${isConsecutive ? '<span style="color:red; font-weight:bold;">🔥 연속!</span>' : '<span style="color:#aaa;">❌ 변경</span>'}
                    </td>
                </tr>
            `;
        }
    }

    if (matchCount === 0) {
        html += `<tr><td colspan="10" style="padding:20px; color:#999;">해당 패턴의 데이터가 없습니다.</td></tr>`;
    }

    html += `
                </tbody>
            </table>
            <p style="margin-top:10px; font-size:12px; color:#666; text-align:left;">
                * 총 <b>${matchCount}번</b>의 패턴 출현 기록입니다. 
                오른쪽 <b>[▶ 다음 패턴]</b> 및 <b>[▶ 다음 합계]</b> 칸을 통해 해당 패턴 출현 후 번호와 합계의 변동 흐름을 추적할 수 있습니다.
            </p>
        </div>
    `;

    document.getElementById('generatorResults').innerHTML = html;
}

// 🎯 완성형 번호 조합 밸런스 검증 함수
function isValidCombination(nums) {
    if (!nums || nums.length !== 6) return false;

    // 오름차순 정렬
    const sorted = [...nums].sort((a, b) => a - b);

    // 1. 합계 검증 (100 ~ 170 구간만 허용)
    const sum = sorted.reduce((acc, cur) => acc + cur, 0);
    if (sum < 100 || sum > 170) return false;

    // 2. 홀짝 비율 검증 (홀수 개수가 2개, 3개, 4개인 경우만 허용)
    const oddCount = sorted.filter(n => n % 2 !== 0).length;
    if (oddCount < 2 || oddCount > 4) return false;

    // 3. 3연속 이상 숫자 차단 (예: 11, 12, 13 금지)
    for (let i = 0; i < sorted.length - 2; i++) {
        if (sorted[i + 1] === sorted[i] + 1 && sorted[i + 2] === sorted[i] + 2) {
            return false;
        }
    }

    // 4. 동일 끝자리 3개 이상 차단 (예: 4, 14, 24 금지)
    const lastDigits = sorted.map(n => n % 10);
    const digitCounts = {};
    for (let d of lastDigits) {
        digitCounts[d] = (digitCounts[d] || 0) + 1;
        if (digitCounts[d] >= 3) return false;
    }

    return true; // 모든 밸런스 조건을 통과한 실전형 조합!
}