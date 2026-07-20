// utils.js
const Utils = {
    // 6개 번호를 받아 5개 구간 분포 코드를 생성 (예: "0-1-2-2-1")
    getDistribution: (nums) => {
        const dist = [0, 0, 0, 0, 0];
        nums.forEach(n => {
            if (n <= 9) dist[0]++;       // 1~9 구간
            else if (n <= 19) dist[1]++; // 10~19 구간
            else if (n <= 29) dist[2]++; // 20~29 구간
            else if (n <= 39) dist[3]++; // 30~39 구간
            else dist[4]++;              // 40~45 구간
        });
        return dist.join('-');
    }
};