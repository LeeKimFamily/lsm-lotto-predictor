// predictor.js
const Predictor = {
    // STEP 5: 분포 예측 엔진
    predictNext: (data, transitions) => {
        const lastDist = data[data.length - 1].dist;
        const nextProbs = Distribution.getNextProbabilities(transitions, lastDist);
        if (!nextProbs || nextProbs.length === 0) return null;
        return nextProbs[0]; // 확률이 가장 높은 최상위 패턴 반환
    },

    renderPrediction: (prediction) => {
        if (!prediction) return '';
        return `
            <div class="box" style="background-color: #e8f6f3; border: 2px solid #27ae60;">
                <h3>[STEP 5] 다음 회차 분포 최종 예측</h3>
                <p>최근 패턴 흐름을 시뮬레이션한 결과입니다.</p>
                <h2 style="color: #27ae60; margin: 10px 0;">차기 예상 분포: ${prediction.dist}</h2>
                <p>예측 신뢰도 (전이 확률 기준): <b>${prediction.prob}%</b></p>
            </div>
        `;
    }
};