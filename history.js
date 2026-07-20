// history.js - 다음 패턴들의 중복 빈도수 랭킹 기능 반영 버전

// 1. 모달 구조 자동 주입
(function initModalStructure() {
    const modalHtml = `
        <div id="patternModal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 9999; justify-content: center; align-items: center; backdrop-filter: blur(3px);">
            <div style="background: white; width: 92%; max-width: 1200px; height: 80vh; border-radius: 10px; padding: 25px; box-shadow: 0 5px 15px rgba(0,0,0,0.3); display: flex; flex-direction: column;">
                
                <!-- 헤더 영역 -->
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #e9ecef; padding-bottom: 15px; margin-bottom: 15px; flex-shrink: 0;">
                    <h3 style="margin: 0; color: #2c3e50; font-size: 1.3em;">🔍 데이터 전후 흐름 검증 모달</h3>
                    <button onclick="closePatternModal()" style="background: #e74c3c; color:white; border:none; padding: 6px 12px; font-size: 14px; border-radius:4px; cursor:pointer; font-weight:bold;">창 닫기</button>
                </div>
                
                <!-- 스크롤 핵심 영역 -->
                <div id="modalTableContainer" style="overflow-y: scroll; flex: 1; min-height: 0; border: 1px solid #eee; padding: 10px; background: #fff; border-radius: 4px;">
                    <!-- 테이블 동적 렌더링 -->
                </div>
                
            </div>
        </div>
    `;
    if (document.body) {
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        });
    }
})();

window.closePatternModal = function() {
    document.getElementById('patternModal').style.display = 'none';
}

// 2. 번호 분포 패턴 계산기 (1~9, 10~19, 20~29, 30~39, 40~45)
function calculatePattern(numbers) {
    if (!numbers || !Array.isArray(numbers)) return '0-0-0-0-0';
    const counts = [0, 0, 0, 0, 0];
    numbers.forEach(num => {
        if (num >= 1 && num <= 9) counts[0]++;
        else if (num >= 10 && num <= 19) counts[1]++;
        else if (num >= 20 && num <= 29) counts[2]++;
        else if (num >= 30 && num <= 39) counts[3]++;
        else if (num >= 40 && num <= 45) counts[4]++;
    });
    return counts.join('-');
}

// 3. 비동기 데이터 로더
async function loadLottoData() {
    try {
        const response = await fetch('./lotto_data.json');
        if (!response.ok) throw new Error('파일을 읽어오지 못했습니다.');
        const rawData = await response.json();
        
        const normalized = rawData.map(item => {
            const round = item["회차"];
            const numbers = item["번호"];
            const dist = calculatePattern(numbers);
            return { round, numbers, dist };
        }).sort((a, b) => a.round - b.round);

        // 최신 회차 패턴으로 인풋창 실시간 동기화
        if (normalized.length > 0) {
            const latestPattern = normalized[normalized.length - 1].dist;
            const traceInput = document.getElementById('traceInput');
            if (traceInput && (traceInput.value === '2-0-2-1-1' || traceInput.value === '')) {
                traceInput.value = latestPattern;
            }
        }
        
        return normalized;
    } catch (error) {
        alert('lotto_data.json 로드 실패: ' + error.message);
        return null;
    }
}

// 💡 [핵심 대수술] 4. 특정 조회 패턴 이후에 나온 '다음 패턴'들의 중복 빈도수 랭킹 계산기
function getNextPatternRankings(data, targetPattern) {
    const nextFrequencyMap = {};
    
    // 1) 대상 패턴의 바로 다음(i+1) 패턴들을 수집 및 카운트
    for (let i = 0; i < data.length - 1; i++) {
        if (data[i].dist === targetPattern) {
            const nextPat = data[i + 1].dist;
            nextFrequencyMap[nextPat] = (nextFrequencyMap[nextPat] || 0) + 1;
        }
    }
    
    // 2) 빈도수가 높은 순서대로 정렬
    const sortedNextPatterns = Object.keys(nextFrequencyMap).sort((a, b) => nextFrequencyMap[b] - nextFrequencyMap[a]);
    
    // 3) 공동 순위를 고려하여 랭킹 매핑
    const nextRankings = {};
    let currentRank = 1;
    
    for (let i = 0; i < sortedNextPatterns.length; i++) {
        const pat = sortedNextPatterns[i];
        if (i > 0 && nextFrequencyMap[pat] < nextFrequencyMap[sortedNextPatterns[i - 1]]) {
            currentRank = i + 1;
        }
        nextRankings[pat] = {
            rank: currentRank,
            count: nextFrequencyMap[pat]
        };
    }
    
    return nextRankings;
}

// 5. 패턴 전후 흐름 추적 (다음 패턴들 중의 순위 실시간 매칭)
window.tracePatternHistory = function(targetPattern) {
    if (!targetPattern) {
        const traceInput = document.getElementById('traceInput');
        targetPattern = traceInput ? traceInput.value.trim() : '1-1-2-2-0';
    }

    loadLottoData().then(data => {
        if (!data) return;

        // 💡 이 타겟 패턴 다음에 출현했던 패턴들의 중복 순위 맵 집계
        const nextRanks = getNextPatternRankings(data, targetPattern);

        let html = `
            <table style="width:100%; border-collapse: collapse; text-align: center; font-size: 13px; font-family: sans-serif;">
                <thead>
                    <tr style="background:#e9ecef; font-weight: bold;">
                        <th style="padding:10px; border:1px solid #ccc; background:#f1f3f5; width: 10%;">◀ 이전 회차</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#f1f3f5; width: 12%;">◀ 이전 패턴</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#fff3cd; width: 10%;">🎯 조회 회차</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#fff3cd; width: 28%;">🎯 조회 번호 (패턴)</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#ffd2d2; color: #d9534f; width: 10%;">▶ 다음 회차</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#ffd2d2; color: #d9534f; width: 15%;">▶ 다음 패턴</th>
                        <th style="padding:10px; border:1px solid #ccc; width: 8%;">연속 여부</th>
                        <th style="padding:10px; border:1px solid #ccc; background:#fff0f0; color: #c0392b; width: 17%;">🔥 다음 패턴 중 복 순 위</th>
                    </tr>
                </thead>
                <tbody>
        `;

        let matchCount = 0;

        for (let i = 0; i < data.length; i++) {
            if (data[i].dist === targetPattern) {
                matchCount++;
                
                const hasPrev = (i - 1 >= 0);
                const prevRound = hasPrev ? data[i - 1] : null;
                const currentRound = data[i];
                const hasNext = (i + 1 < data.length);
                const nextRound = hasNext ? data[i + 1] : null;
                const isConsecutive = hasNext && (nextRound.dist === targetPattern);
                
                let rowStyle = '';
                let prevRoundText = '-';
                let prevPatternText = '-';
                let nextRoundText = '-';
                let nextPatternText = '-';
                let statusBadge = '<span style="color:#aaa;">❌ 변경</span>';
                let rankBadge = '<span style="color:#bbb;">-</span>';

                if (hasPrev) {
                    prevRoundText = `${prevRound.round}회`;
                    prevPatternText = prevRound.dist;
                }

                if (!hasNext) {
                    // 최신 회차(다음 데이터가 아직 없는 경우)
                    rowStyle = 'background-color: #e8f4fd; font-weight: bold;';
                    nextRoundText = `<span style="color:#2980b9;">${currentRound.round + 1}회</span>`;
                    nextPatternText = '<span style="color:#2980b9; font-size:11px;">추천 대기중 (미래)</span>';
                    statusBadge = '<span style="color:#2980b9;">✨ 최신회차</span>';
                    rankBadge = '<span style="color:#2980b9; font-size:11px;">예측 대상</span>';
                } else {
                    nextRoundText = `${nextRound.round}회`;
                    nextPatternText = nextRound.dist;

                    if (isConsecutive) {
                        rowStyle = 'background-color: #fff9db; font-weight: bold;';
                        statusBadge = '<span style="color:#e74c3c; font-weight:bold;">🔥 연속!</span>';
                    }

                    // 💡 핵심: 해당 다음 패턴이 이 타겟 뒤에서 몇 등짜리 중복 빈도인지 매칭
                    const info = nextRanks[nextRound.dist] || { rank: '-', count: 0 };
                    
                    let badgeBg = '#95a5a6'; // 기본 회색
                    if (info.rank === 1) badgeBg = '#e74c3c'; // 1등은 강렬한 빨간색
                    else if (info.rank === 2) badgeBg = '#e67e22'; // 2등 주황색
                    else if (info.rank === 3) badgeBg = '#f1c40f'; // 3등 노란색
                    
                    rankBadge = `<span style="background:${badgeBg}; color:white; padding:3px 8px; border-radius:4px; font-size:11px; font-weight:bold; display:inline-block;">${info.rank}순위</span> <span style="color:#7f8c8d; font-size:11px;">(총 ${info.count}회)</span>`;
                }

                html += `
                    <tr style="${rowStyle}">
                        <td style="padding:10px; border:1px solid #eee; color:#666;">${prevRoundText}</td>
                        <td style="padding:10px; border:1px solid #eee; color:#666; font-family:monospace;">${prevPatternText}</td>
                        <td style="padding:10px; border:1px solid #eee; font-weight:bold; background:#fffbeb;">${currentRound.round}회</td>
                        <td style="padding:10px; border:1px solid #eee; background:#fffbeb;">
                            ${currentRound.numbers.join(', ')} <b style="color:#e67e22;">(${currentRound.dist})</b>
                        </td>
                        <td style="padding:10px; border:1px solid #eee; background:#fff5f5;">${nextRoundText}</td>
                        <td style="padding:10px; border:1px solid #eee; font-family:monospace; background:#fff5f5;">${nextPatternText}</td>
                        <td style="padding:10px; border:1px solid #eee;">${statusBadge}</td>
                        <!-- 🎯 [수정 완료] 후속 패턴들 중 복 순 위 실시간 출력 -->
                        <td style="padding:10px; border:1px solid #eee; background:#fffcfc; font-weight:bold;">${rankBadge}</td>
                    </tr>
                `;
            }
        }

        if (matchCount === 0) {
            html += `<tr><td colspan="8" style="padding:30px; color:#999; font-size:14px;">해당 패턴 [ ${targetPattern} ]의 데이터 흐름이 기록에 없습니다.</td></tr>`;
        }

        html += `</tbody></table>`;

        document.getElementById('patternModal').querySelector('h3').innerText = `🔍 패턴 [ ${targetPattern} ] 흐름 분석 (다음 주 중복 빈도 순위 적용)`;
        document.getElementById('modalTableContainer').innerHTML = html;
        document.getElementById('patternModal').style.display = 'flex';
    });
};

// 6. 전체 보기 모달 기능 (전체보기 리스트에는 기존 기본 명세 유지)
window.viewAllLottoData = function() {
    loadLottoData().then(data => {
        if (!data) return;

        let html = `
            <div style="margin-bottom: 15px; text-align: left; font-size: 14px; color: #555;">
                현재 json 로드 상태: 총 <b>${data.length}</b>개의 회차가 등록되어 있습니다. (패턴 클릭 시 흐름 모달로 연동됩니다)
            </div>
            <table style="width:100%; border-collapse: collapse; text-align: center; font-size: 13px; font-family: sans-serif;">
                <thead>
                    <tr style="background:#f1f3f5; font-weight: bold;">
                        <th style="padding:10px; border:1px solid #ccc; width: 20%;">회차</th>
                        <th style="padding:10px; border:1px solid #ccc; width: 50%;">당첨 번호</th>
                        <th style="padding:10px; border:1px solid #ccc; width: 30%;">적용된 패턴 (dist)</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const displayData = [...data].sort((a, b) => b.round - a.round);

        displayData.forEach(item => {
            html += `
                <tr onclick="closePatternModal(); document.getElementById('traceInput').value='${item.dist}'; window.tracePatternHistory('${item.dist}');" 
                    title="클릭 시 이 회차의 패턴으로 흐름 추적" style="cursor:pointer; hover:background:#f8f9fa;">
                    <td style="padding:10px; border:1px solid #eee; font-weight: bold; background: #fafafa;">${item.round}회</td>
                    <td style="padding:10px; border:1px solid #eee; font-size: 14px; letter-spacing: 0.5px;">${item.numbers.join(', ')}</td>
                    <td style="padding:10px; border:1px solid #eee; font-family: monospace; color: #2980b9; font-weight: bold;">${item.dist} 👆</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;

        document.getElementById('patternModal').querySelector('h3').innerText = '📊 lotto_data.json 전체 원본 데이터 목록';
        document.getElementById('modalTableContainer').innerHTML = html;
        document.getElementById('patternModal').style.display = 'flex';
    });
};

window.addEventListener('DOMContentLoaded', () => {
    loadLottoData();
});