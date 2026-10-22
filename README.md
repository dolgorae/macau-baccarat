# Macau Baccarat

마카오 카지노 매스 플로어를 참고한 웹 바카라 시뮬레이터입니다. 가상 머니로만 플레이합니다.

**플레이: https://dolgorae.github.io/macau-baccarat/**

- 8덱 슈, 번 카드, 컷카드, 정식 서드카드 룰(Tableau)
- 免佣(노커미션) 기본: Banker 6으로 승리 시 1:0.5 · Tie 1:8 · Pair 1:11 · Super 6 1:12
- 테이블 등급별 미니멈/맥시멈 (HKD 500 ~ 10,000 테이블)
- 로드맵: 구슬판, 빅로드, 대안자, 소로, 갑유로 + 문로(問路)
- 스퀴즈(咪牌) 옵션
- 잔고와 기록은 각자 브라우저에 저장됩니다

## 개발

```sh
npm install
npm run dev      # 로컬 실행
npm test         # 엔진 테스트
npm run deploy   # 빌드 후 GitHub Pages(gh-pages 브랜치)에 배포
```
