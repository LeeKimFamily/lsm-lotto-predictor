// distribution.js
const Distribution = {
    // STEP 2: 분포 전이 행렬 계산
    analyzeTransitions: (data) => {
        const transitions = {};
        for (let i = 0; i < data.length - 1; i++) {
            const curr = data[i].dist;
            const next = data[i + 1].dist;
            
            if (!transitions[curr]) transitions[curr] = {};
            transitions[curr][next] = (transitions[curr][next] || 0) + 1;
        }
        return transitions;
    },

    getNextProbabilities: (transitions, currentDist) => {
        const nextDistCounts = transitions[currentDist];
        if (!nextDistCounts) return null;

        const total = Object.values(nextDistCounts).reduce((a, b) => a + b, 0);
        return Object.entries(nextDistCounts)
            .map(([dist, count]) => ({
                dist,
                prob: ((count / total) * 100).toFixed(1)
            }))
            .sort((a, b) => b.prob - a.prob);
    },

    renderUI: (transitions, lastDist) => {
        const probs = Distribution.getNextProbabilities(transitions, lastDist);
        let html = `
            <div class="box">
                <h3>[STEP 2] 분포 전이 분석</h3>
                <p><b>최근 회차 기준 분포:</b> <span style="color:#e74c3c; font-weight:bold;">${lastDist}</span></p>
                <h4>다음 회차 출현 예측 확률 TOP 3</h4>
        `;

        if (probs && probs.length > 0) {
            html += `<ul>`;
            probs.slice(0, 3).forEach((p, idx) => {
                html += `<li><b>${idx + 1}위:</b> ${p.dist} 분포 -> <span style="color:#2ecc71; font-weight:bold;">${p.prob}%</span></li>`;
            });
            html += `</ul>`;
        } else {
            html += `<p style="color:#999;">분석 가능한 이전 전이 패턴이 없습니다.</p>`;
        }
        html += `</div>`;
        return html;
    }
};