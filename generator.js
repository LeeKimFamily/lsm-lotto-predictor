// generator.js
const Generator = {
    // STEP 6: 특정 분포 기반 무작위 번호 조합 생성
    generateByDist: (distStr) => {
        const ranges = [[1,9], [10,19], [20,29], [30,39], [40,45]];
        const dists = distStr.split('-').map(Number);
        let result = [];

        dists.forEach((count, idx) => {
            const [min, max] = ranges[idx];
            let segmentNums = [];
            
            while(segmentNums.length < count) {
                const num = Math.floor(Math.random() * (max - min + 1)) + min;
                if(!segmentNums.includes(num)) {
                    segmentNums.push(num);
                }
            }
            result.push(...segmentNums);
        });
        return result.sort((a, b) => a - b);
    }
};