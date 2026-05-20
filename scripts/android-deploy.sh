#!/bin/bash
# ============================================================
# FMO仪表盘 Android 快速编译部署到真机脚本
# 用法: bash scripts/android-deploy.sh [选项]
#
# 选项:
#   --no-launch     仅安装不启动
#   --logcat        启动后自动显示 Capacitor 日志
#   --clean         重新编译前清理 Android 构建缓存
#   --release       编译 release 版本 (默认 debug)
#   -h, --help      显示帮助
# ============================================================
set -euo pipefail

# ---- 配置 ----
APP_ID="net.bh1jss.fmodashboard"
APP_ACTIVITY="${APP_ID}/.MainActivity"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ANDROID_DIR="$PROJECT_DIR/android"
LOG_TAGS="Capacitor/Console FmoEventsPlugin FmoAudioPlugin WebViewAuth AndroidRuntime"

# ---- 颜色 ----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ---- 参数 ----
LAUNCH=true
SHOW_LOGCAT=false
CLEAN_BUILD=false
BUILD_TYPE="Debug"

print_help() {
  echo "用法: bash scripts/android-deploy.sh [选项]"
  echo ""
  echo "选项:"
  echo "  --no-launch     仅安装 APK，不启动 App"
  echo "  --logcat        启动 App 后自动显示 logcat 日志"
  echo "  --clean         构建前清理 Android 缓存"
  echo "  --release       编译 release 版本（默认 debug）"
  echo "  -h, --help      显示此帮助信息"
  echo ""
  echo "示例:"
  echo "  bash scripts/android-deploy.sh                  # 编译+安装+启动"
  echo "  bash scripts/android-deploy.sh --logcat         # 编译+安装+启动+看日志"
  echo "  bash scripts/android-deploy.sh --clean --logcat # 清理+编译+安装+启动+看日志"
  exit 0
}

for arg in "$@"; do
  case $arg in
    --no-launch) LAUNCH=false ;;
    --logcat) SHOW_LOGCAT=true ;;
    --clean) CLEAN_BUILD=true ;;
    --release) BUILD_TYPE="Release" ;;
    -h|--help) print_help ;;
    *) echo -e "${RED}未知参数: $arg${NC}"; print_help ;;
  esac
done

# ---- 函数 ----
step()  { echo -e "\n${CYAN}[$(date +%H:%M:%S)] ▶ $1${NC}"; }
ok()    { echo -e "  ${GREEN}✓${NC} $1"; }
warn()  { echo -e "  ${YELLOW}⚠${NC} $1"; }
fail()  { echo -e "  ${RED}✗${NC} $1"; exit 1; }

# ---- Step 1: 检查设备连接 ----
step "检查 Android 设备连接"
cd "$PROJECT_DIR"

DEVICE_COUNT=$(adb devices 2>/dev/null | grep -v "List of devices" | grep -c "device$" || echo 0)

if [ "$DEVICE_COUNT" -eq 0 ]; then
  fail "未检测到已连接的 Android 设备，请确认：\n    1. USB 已连接\n    2. 手机已开启 USB 调试\n    3. 手机已授权此电脑调试"
fi

DEVICE_NAME=$(adb devices 2>/dev/null | grep "device$" | head -1 | awk '{print $1}')
ok "已连接设备: $DEVICE_NAME"

# 检查签名冲突：如果旧版本已安装且签名不一致，提示手动卸载
INSTALLED=$(adb shell pm list packages "$APP_ID" 2>/dev/null || echo "")
if [ -n "$INSTALLED" ]; then
  warn "检测到旧版本已安装，如签名不一致请先手动执行: adb uninstall $APP_ID"
fi

# ---- Step 2: 构建前端 ----
step "构建 web 前端 (vite build)"
npm run build || fail "前端构建失败"
ok "前端构建完成 → dist/"

# ---- Step 3: 同步到 Android ----
step "同步 web 资源到 Android (cap sync)"
npx cap sync android || fail "Capacitor 同步失败"
ok "Capacitor 同步完成"

# ---- Step 4: 构建 APK ----
step "编译 Android APK (${BUILD_TYPE})"
cd "$ANDROID_DIR"

BUILD_TYPE_LOWER=$(echo "$BUILD_TYPE" | tr '[:upper:]' '[:lower:]')
GRADLE_TASK=":app:assemble${BUILD_TYPE}"

if [ "$CLEAN_BUILD" = true ]; then
  warn "清理 Android 构建缓存..."
  ./gradlew clean 2>&1 | tail -3
fi

echo "  执行: ./gradlew $GRADLE_TASK"
./gradlew "$GRADLE_TASK" 2>&1 | tail -5

# 查找生成的 APK
APK_PATTERN="app/build/outputs/apk/${BUILD_TYPE_LOWER}/app-${BUILD_TYPE_LOWER}.apk"
if [ ! -f "$APK_PATTERN" ]; then
  fail "APK 未生成，请检查编译日志"
fi
APK_SIZE=$(ls -lh "$APK_PATTERN" | awk '{print $5}')
ok "APK 编译完成 ($APK_SIZE)"

# ---- Step 5: 安装到设备 ----
step "安装 APK 到设备"
adb install -r "$APK_PATTERN" || fail "APK 安装失败"
ok "安装成功 → $DEVICE_NAME"

# ---- Step 6: 启动 App ----
if [ "$LAUNCH" = true ]; then
  step "启动 App"
  adb shell am start -n "$APP_ACTIVITY" > /dev/null 2>&1 || warn "启动命令执行异常，请手动打开 App"
  ok "App 已启动"

  # 等 App 启动
  sleep 2

  # ---- Step 7: logcat (可选) ----
  if [ "$SHOW_LOGCAT" = true ]; then
    step "显示 logcat 日志 (Ctrl+C 退出)"
    echo "  Tags: $LOG_TAGS"
    echo "  ----------------------------------------"
    adb logcat -c 2>/dev/null || true  # 清空旧日志
    adb logcat -s $LOG_TAGS
  fi
fi

echo -e "\n${GREEN}=== 部署完成 ===${NC}"
cd "$PROJECT_DIR"
