# 에슈르 빵댕이 때리기 — GitHub Pages 배포용

완성된 Live2D 모델의 **좌측/우측 히트 에어리어를 터치**하면 각각 해당 모션을 실행하고, 작은 원형 파동을 표시하며, 좌우별 **타격 효과음을 즉시** 재생하고 기존 대사 음성 `touch.wav`를 **클릭 0.5초 후** 재생합니다. 모든 음성은 볼륨 50%입니다.

- 시작 화면 제목: **에슈르 빵댕이 때리기**
- 시작 버튼 한 개만 사용. 플레이 화면에는 메뉴/테스트/안내 버튼 없음.
- 배경: 제공된 `background.webp` 원본 사용 (배경 원본 1593×1020의 비율을 유지, 스마트폰 세로 화면에서는 좌우 가장자리를 크롭).
- 지정된 히트 영역 이외를 누르면 반응하지 않음.
- 왼쪽 클릭: `public/assets/left.wav`를 즉시 재생 → 0.5초 뒤 `public/assets/touch.wav` 재생.
- 오른쪽 클릭: `public/assets/right.wav`를 즉시 재생 → 0.5초 뒤 `public/assets/touch.wav` 재생.
- **좌우 효과음 파일은 모두 ZIP에 포함되어 있습니다.** 왼쪽(`left.wav`, 약 0.32초), 오른쪽(`right.wav`, 약 0.50초), 대사(`touch.wav`, 약 2.16초). 별도로 추가할 필요 없습니다.
- 연타 시 직전 클릭의 재생 중인 소리와 0.5초 뒤 나올 예정이던 음성을 중단하고 새로운 클릭의 소리로 교체합니다.
- 모델: `public/model/character.model3.json` 안에 `HitAreas` / `Left` / `Right` 모션 설정 포함.

## 이번 업데이트: 모바일 + 신규 모션 + 대사 0.5초

- 새로 제공한 `왼쪽.motion3.json` / `오른쪽.motion3.json`으로 `public/model/left.motion3.json` / `right.motion3.json`을 교체했습니다. 클릭 모션은 **한 번만 재생**되도록 Loop 메타데이터를 비활성화했습니다.
- **좌우 효과음은 즉시**, 기존 에슈르 대사는 **클릭 0.5초 뒤**에 재생됩니다. 모든 음량 50% 및 연타 시 이전 오디오 취소는 유지합니다.
- 원본 배경(1593×1020)과 Live2D 모델을 하나의 **중앙 정렬 장면**에 묶었습니다. PC 화면의 기존 배치를 그대로 유지하고, 스마트폰 세로 화면에서는 가운데에 위치한 가상의 **16:9 PC 장면**을 보여줍니다. 배경은 원본 비율을 유지하며 스마트폰에서는 좌우 가장자리가 잘립니다.
- GitHub Pages의 하위 저장소 주소에서도 배경 이미지가 제대로 로드되도록 상대 경로를 적용했습니다.

### 기존 GitHub 저장소 갱신하기 (CMD)

압축을 푼 새 버전 내용물을 **기존 Git 저장소 폴더에 덮어쓰기 복사**한 뒤, 해당 폴더의 CMD에서 다음을 입력하세요.

```cmd
git add .
git commit -m "Update mobile layout, motions and voice timing"
git push
```

GitHub Pages 배포 워크플로가 자동으로 실행됩니다.

## GitHub에서 누구나 플레이하도록 배포하기

1. GitHub에 **Public** 저장소(예: `ashur-touch`)를 생성합니다.
2. 이 ZIP을 **압축 해제**하고, 폴더의 **내용물 전체**를 저장소 최상위에 업로드합니다. `.github/workflows/deploy.yml`도 꼭 업로드해야 합니다. ZIP 자체 업로드는 안 됩니다. (Git 사용을 권장합니다.)
3. GitHub 저장소의 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 바꿉니다. ※ 이전처럼 `Deploy from a branch`로 하면 이 버전은 빌드되지 않습니다.
4. `main` 브랜치에 업로드/Commit하면 **Actions** 탭의 `Deploy 에슈르 빵댕이 때리기 to GitHub Pages` 작업이 자동 실행됩니다.
5. 배포가 끝나면 `https://사용자이름.github.io/ashur-touch/`와 같이 접속할 수 있습니다.

### Git으로 업로드하는 방법 (초기 1회)
```bash
git init
git add .
git commit -m "Publish Ashur Live2D game"
git branch -M main
git remote add origin https://github.com/사용자이름/ashur-touch.git
git push -u origin main
```

## 컴퓨터에서 개발 실행

Windows에서 가장 쉬운 방법: **Node.js 22 이상을 설치한 뒤 `실행하기.bat`을 더블클릭하세요.** 첫 실행 때 npm 의존성을 자동 설치하고 Vite 로컬 서버를 실행하며 브라우저를 엽니다. `index.html`을 직접 더블클릭하면 파일 접근 제한으로 실행되지 않습니다.

수동 실행은 아래 명령을 사용하세요:
```bash
npm install
npm run dev
```
표시되는 localhost 주소로 접속합니다. GitHub Actions는 자동으로 `npm install` 및 `npm run build` 후 `dist`만 사이트에 배포합니다.

## 라이브러리 자체 호스팅 / Cubism Core

- `live2d-web@0.9.0`은 **빌드할 때 npm에서 설치하여 Vite가 묶으므로, 사이트 방문자는 라이브러리 CDN을 이용하지 않습니다.** GitHub Pages에서 JS/CSS를 제공합니다.
- **Cubism Core 6은 Live2D 독점 라이선스 적용**: 제공된 ZIP/공개 GitHub 저장소에는 Core 자체를 동봉하지 않았습니다. **기본값은 Live2D의 공식 Core 호스팅 주소**(`https://cubism.live2d.com/sdk-web/core/06/live2dcubismcore.min.js`)입니다.
- 공식 조건에 따라 Cubism Core를 직접 호스팅할 권리가 있다면 Live2D 공식 SDK 다운로드 페이지에서 Core 파일을 받아 `public/vendor/live2dcubismcore.min.js` 위치에 넣으세요. 코드가 로컬 파일을 우선 사용합니다. 공개 저장소에 파일을 넣기 전 재배포 조건을 꼭 확인하세요.
- 공식 문서: https://docs.live2d.com/ko/cubism-sdk-manual/cubism-core/ / https://www.live2d.com/ko/sdk/license/

## 중요한 참고

- 사용자 제공 모델, 음성, 이미지가 전부 Public Pages로 배포되므로 **방문자가 파일을 내려받을 수 있습니다**. 권리와 공개 배포 가능 여부를 먼저 확인해 주세요.
- GitHub Actions 빌드 및 실제 WebGL2 모델 렌더링은 이 생성 환경에서 원격 패키지 다운로드가 제한되어 직접 확인하지 못했습니다. 제공 모델은 MOC3 버전 6이고 서드파티 라이브러리 문서에서 보장하는 Core 버전은 5.3이므로 실제 Core 6 호환성도 확인이 필요합니다. 에러가 발생하면 브라우저 개발자 도구의 Console/Network 로그를 확인하세요.
- 스마트폰 브라우저는 사용자 터치로만 음성을 재생할 수 있어 시작 화면을 둔 구성입니다.
