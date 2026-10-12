#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
感通算用一体化智能平台 · 汇报演示 —— 构建脚本（Windows 版）

用法（在本机用受管 Python 执行）：
    <python> build.py              # 构建到本地交付文件 + 发布目录
    <python> build.py --publish    # 构建，并输出发布到线上所需的信息

源码拆分说明（改哪部分就编辑哪个文件）：
    src/p1.html   —— 全部 CSS（样式、配色变量 :root、1920x1080 自适应缩放）
    src/p2.html   —— 全部 HTML 结构（9 个场景 s0~s8 的文案）
    src/p3.js     —— 全部 JS（交互 / 数据 / 动画 / 推演 SIM / 问答 QA / 行业 IND）
    src/land.js   —— 世界陆地轮廓数据（45KB，离线内联，勿手改）

常用改动位置：
    改文案 → src/p2.html 直接搜文字替换
    改配色 → src/p1.html 开头 :root 里的 CSS 变量
    改数据 → src/p3.js：SATS/STATIONS/SENSORS/LOCS/LINK/IND/SIM/QA/AUTO
"""

import os
import io
import sys
import shutil

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, 'src')
ROOT = os.path.dirname(BASE)                                    # 工作区根目录

OUT_LOCAL = os.path.join(ROOT, '感通算用智能平台_汇报演示.html')
SITE_DIR = os.path.join(ROOT, 'publish-site')
SITE_INDEX = os.path.join(SITE_DIR, 'index.html')
LOG_FILE = os.path.join(BASE, '_build_log.txt')

LINES = []


def log(*a):
    s = ' '.join(str(x) for x in a)
    LINES.append(s)
    try:
        print(s)
    except UnicodeEncodeError:
        pass


def read(name):
    with io.open(os.path.join(SRC, name), encoding='utf-8') as f:
        return f.read()


def build():
    for n in ('p1.html', 'p2.html', 'p3.js', 'land.js'):
        if not os.path.exists(os.path.join(SRC, n)):
            log('缺少源文件：src/' + n)
            return None

    p1 = read('p1.html')
    p2 = read('p2.html')
    p3 = read('p3.js')
    land = read('land.js')
    imgs = read('ind_imgs.js') if os.path.exists(os.path.join(SRC, 'ind_imgs.js')) else ''
    for extra in ('sim_imgs.js', 'game_imgs.js', 'ans_imgs.js', 'sen_imgs.js'):
        if os.path.exists(os.path.join(SRC, extra)):
            imgs += '\n' + read(extra)

    if '/*__LAND__*/' not in p3:
        log('警告：p3.js 里找不到 /*__LAND__*/ 占位符，地图数据可能已内联，跳过注入。')
    else:
        p3 = p3.replace('/*__LAND__*/', land)

    html = p1 + p2
    if imgs:
        html += '\n<script>\n' + imgs + '\n</script>\n'
    html += '\n<script>\n' + p3 + '\n</script>\n</body>\n</html>\n'

    with io.open(OUT_LOCAL, 'w', encoding='utf-8', newline='') as f:
        f.write(html)
    log('[OK] 本地交付文件：%s  (%s 字节)' % (OUT_LOCAL, format(len(html.encode('utf-8')), ',')))

    os.makedirs(SITE_DIR, exist_ok=True)
    shutil.copyfile(OUT_LOCAL, SITE_INDEX)
    log('[OK] 发布目录已同步：%s' % SITE_INDEX)
    return html


def publish_help():
    log('')
    log('=' * 60)
    log('发布说明')
    log('=' * 60)
    log('本机的发布能力由 WorkBuddy「发布为应用」工具提供，')
    log('需要在对话中由助手调用 workbuddy_sites_deploy 完成，')
    log('不能由本脚本直接 subprocess 拉起（原 Linux 沙箱路径已失效）。')
    log('')
    log('构建产物已就绪，可直接发布：')
    log('  待发布目录：%s' % SITE_DIR)
    log('  入口页面  ：index.html')
    log('  建议语言  ：static')
    log('')
    log('关于沿用原链接 https://a1390c552cf8482f6.app.workbuddy.host ：')
    log('该链接由原账号/原沙箱创建。本机 ~/.workbuddy 下没有它的')

    hist = os.path.join(os.path.expanduser('~'), '.workbuddy-sandbox-publish', 'state.json')
    if os.path.exists(hist):
        log('发布状态，但检测到 %s 存在，沿用概率较高。' % hist)
    else:
        log('发布状态记录（~/.workbuddy-sandbox-publish/state.json 不存在），')
        log('直接发布很可能生成【新链接】。若必须沿用原链接，')
        log('请从原账号导出 src/publish-state.json.bak 放到本项目 src/ 下。')
    log('=' * 60)


if __name__ == '__main__':
    try:
        LINES.append('')
        build()
        if '--publish' in sys.argv:
            publish_help()
        else:
            log('')
            log('提示：加 --publish 参数可查看发布到线上链接的说明。')
    finally:
        with io.open(LOG_FILE, 'w', encoding='utf-8', newline='') as f:
            f.write('\n'.join(LINES))
