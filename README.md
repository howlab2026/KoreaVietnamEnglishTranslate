# 실시간 다국어 라이브 자막 (Korea · Vietnam · English Live Translate)

한국어(🇰🇷), 영어(🇺🇸), 베트남어(🇻🇳) 3개 국어 간 실시간 음성 인식 및 쌍방향 동시 라이브 자막 웹 애플리케이션입니다.  
Google Gemini 3.5 Live Translate API를 활용하여 음성을 인식하는 동시에 2개의 타겟 언어로 지연 없이 실시간 동시 번역하여 표시합니다.

---

## 🌟 주요 기능

- **3개 국어 상호 라이브 번역**:
  - `🇰🇷 한국어로 말하기`: 한국어 원문 발화 → 🇻🇳 베트남어 & 🇺🇸 영어 실시간 동시 번역
  - `🇺🇸 Speak in English`: 영어 원문 발화 → 🇻🇳 베트남어 & 🇰🇷 한국어 실시간 동시 번역
  - `🇻🇳 Nói Tiếng Việt`: 베트남어 원문 발화 → 🇺🇸 영어 & 🇰🇷 한국어 실시간 동시 번역
- **스마트 2분할 대시보드 레이아웃**:
  - **상단 줄**: 번역 1 영역(50%)과 번역 2 영역(50%)이 반반씩 나란히 배치
  - **하단 줄**: 원문 발화 영역이 100% 전체 너비로 시원하게 배치
  - **화면 자동 높이 최적화**: 뷰포트 크기에 맞춰 각 패널의 높이가 자동으로 최적 조정
- **문장 단위 자동 줄바꿈**:
  - 마침표(`.`), 물음표(`?`), 느낌표(`!`) 등 문장이 끝날 때마다 자동으로 다음 줄로 줄바꿈되어 강의·회의 시 최상의 가독성 제공
- **낮/밤 모드 테마 전환**:
  - 깔끔하고 눈이 편안한 밝은 흰색 테마(기본) 및 상단 우측 원클릭 `🌙 밤 모드` / `☀️ 낮 모드` 토글 지원 (설정 자동 저장)
- **상단 "번역 기록" 팝업 모달**:
  - 상단 메뉴의 `📜 번역 기록` 버튼을 통해 팝업 모달로 누적 번역 히스토리 및 타이머 확인 가능 (화면 공간 효율 극대화)
- **마이크 자동 감지 & 입력 레벨 미터**:
  - USB 마이크 연결/해제 실시간 핫플러그 감지 및 실시간 음성 입력 볼륨 게이지 표시
- **프로젝터 / TV 최적화**:
  - 폰트 크기 슬라이더(22px~60px) 및 `⛶ 전체화면` 모드 기본 지원

---

## 🛠️ 기술 스택

- **Backend**: Node.js, Express
- **Frontend**: Vanilla HTML5, Modern CSS3 (Grid & Flexbox), Vanilla JavaScript (Web Audio API)
- **AI Model**: Google Gemini 3.5 Live Translate (`models/gemini-3.5-live-translate-preview`)
- **Protocol**: Bidirectional Streaming WebSocket (`BidiGenerateContent`)

---

## 🚀 시작하기

### 1. 사전 준비

- Node.js 20 이상
- Google Gemini API Key ([Google AI Studio](https://aistudio.google.com/)에서 발급)

### 2. 환경 설정

저장소를 클론한 후 프로젝트 루트에 `.env` 파일을 생성합니다:

```bash
cp .env.example .env
```

`.env` 파일에 발급받은 Gemini API 키를 입력합니다:

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
PORT=3000
```

### 3. 설치 및 실행

```bash
# 의존성 설치
npm install

# 서버 실행
npm start
```

브라우저에서 접속:
```text
http://localhost:3000
```

---

## 📖 사용 방법

1. 상단에서 **발화할 언어**(한국어 / English / Tiếng Việt) 버튼을 선택합니다.
2. 입력에 사용할 **마이크 장치**를 선택합니다 (USB 마이크 연결 시 자동 인식).
3. `🎤 번역 시작` 버튼을 누르고 브라우저 마이크 권한을 허용합니다.
4. 마이크에 대고 말하면 상단 2개 창에 번역문이, 하단 창에 원문이 실시간으로 표시됩니다.
5. 상단 우측 `📜 번역 기록` 버튼을 누르면 이전 발화 및 번역 이력을 언제든 확인할 수 있습니다.

---

## 📄 라이선스

MIT License
