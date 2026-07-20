// analyzer.js
const Analyzer = {
    // STEP 1: 전체 통계 및 구간 분포 분석
    analyze: (data) => {
        if (data.length === 0) return null;

        const totalRounds = data.length;
        const totalSum = data.reduce((acc, cur) => acc + cur.sum, 0);
        const avgSum = (totalSum / totalRounds).toFixed(2);

        const distCount = {};
        data.forEach(item => {
            distCount[item.dist] = (distCount[item.dist] || 0) + 1;
        });

        const sortedDist = Object.entries(distCount)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 30);

        return { totalRounds, avgSum, topDist: sortedDist };
    },

    render: (stats) => {
        if (!stats) return '';
        return `
            <div class="box">
                <h3>[STEP 1] 전체 통계 분석</h3>
                <p><b>총 분석 회차:</b> ${stats.totalRounds}회</p>
                <p><b>평균 합계:</b> ${stats.avgSum}</p>
                <h4>구간 분포 TOP 30 (1위~30위)</h4>
                <ul>
                    ${stats.topDist.map((item, idx) => `
                        <li><b>${idx + 1}위:</b> ${item[0]} 분포 (${item[1]}회 출현)</li>
                    `).join('')}
                </ul>
            </div>
        `;
    }
};

// STEP 3: 최근 흐름 분석 (종합)
const TrendAnalyzer = {
    getTrend: (data, windowSize) => {
        const recentData = data.slice(-windowSize);
        const distSums = [0, 0, 0, 0, 0];
        
        recentData.forEach(item => {
            const distArr = item.dist.split('-').map(Number);
            distArr.forEach((val, idx) => distSums[idx] += val);
        });

        return distSums.map(s => (s / recentData.length).toFixed(2));
    },

    renderTrend: (data) => {
        const t20 = TrendAnalyzer.getTrend(data, 20);
        const tAll = TrendAnalyzer.getTrend(data, data.length);

        return `
            <div class="box">
                <h3>[STEP 3] 최근 흐름 분석 (최근 20회)</h3>
                <table>
                    <tr><th>구간</th><th>전체평균</th><th>최근20회</th><th>흐름</th></tr>
                    ${['1-9', '10대', '20대', '30대', '40대'].map((name, i) => `
                        <tr>
                            <td>${name}</td>
                            <td>${tAll[i]}</td>
                            <td>${t20[i]}</td>
                            <td style="color: ${t20[i] > tAll[i] ? '#e74c3c' : '#2980b9'}; font-weight:bold;">
                                ${t20[i] > tAll[i] ? '▲ 상승' : '▼ 하강'}
                            </td>
                        </tr>
                    `).join('')}
                </table>
            </div>
        `;
    }
};

// STEP 4: 현재 회차와 동일한 분포를 가졌던 과거 회차 찾기
const PastAnalyzer = {
    findMatches: (data, currentDist) => {
        const pastData = data.slice(0, -1);
        return pastData.filter(item => item.dist === currentDist);
    },

    renderMatches: (matches) => {
        if (matches.length === 0) {
            return `<div class="box"><h3>[STEP 4] 동일 분포 과거 회차</h3><p>동일한 패턴의 과거 기록이 없습니다.</p></div>`;
        }

        return `
            <div class="box">
                <h3>[STEP 4] 동일 분포 과거 회차 (총 ${matches.length}회 일치)</h3>
                <table>
                    <tr><th>회차</th><th>당첨 번호</th><th>합계</th></tr>
                    ${matches.slice(-5).map(m => `
                        <tr>
                            <td><b>${m.round}회</b></td>
                            <td>${m.numbers.join(', ')}</td>
                            <td>${m.sum}</td>
                        </tr>
                    `).join('')}
                </table>
                <p style="font-size: 0.85em; color: #7f8c8d; margin-top:8px;">* 가장 최근 5개 기록만 표시합니다.</p>
            </div>
        `;
    }
};

// STEP 7 & 8: AI 평가 및 과거 이력 추적 검증
const AIEvaluator = {
    evaluate: (nums) => {
        let score = 0;
        
        // 1. 연번 체크
        let consecutives = 0;
        for(let i=0; i<nums.length-1; i++) if(nums[i+1] === nums[i] + 1) consecutives++;
        if(consecutives <= 2) score += 25;

        // 2. 끝수 중복 체크
        const lastDigits = nums.map(n => n % 10);
        const counts = {};
        lastDigits.forEach(d => counts[d] = (counts[d] || 0) + 1);
        if(Object.values(counts).every(c => c < 3)) score += 25;

        // 3. 홀짝 비율 (밸런스 필터)
        const odds = nums.filter(n => n % 2 !== 0).length;
        if(odds >= 2 && odds <= 4) score += 25;

        // 4. 합계 필터 (100 ~ 170)
        const sum = nums.reduce((a, b) => a + b, 0);
        if(sum >= 100 && sum <= 170) score += 25;

        return score;
    }
};

const Validator = {
    checkHistory: (generatedNums, allData) => {
        let stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        allData.forEach(row => {
            const matchCount = generatedNums.filter(n => row.numbers.includes(n)).length;
            if (matchCount === 6) stats[1]++;
            else if (matchCount === 5) stats[2]++;
            else if (matchCount === 4) stats[3]++;
            else if (matchCount === 3) stats[4]++;
            else if (matchCount === 2) stats[5]++;
        });
        return stats;
    }
};