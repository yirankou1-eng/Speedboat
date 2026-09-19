修改本项目时，用完整、连贯的段落沟通，不使用零散的项目符号。避免为了非必要的工作反复扩大测试范围或消耗额外用量。

每轮实质修改前，在 backups 目录新增一个带日期或时间的 ZIP 备份，包含当时的项目代码、资源、说明和测试，不包含 backups 目录自身。验证备份可读取后再修改。后续新增备份默认保留，除非用户明确要求清理。2026-09-18 对手速度和起跑位置调整完成后，用户要求清空此前所有备份（包括 before-course-update 及本轮修改前备份），并自行复制项目文件夹；这些备份无需恢复。更早的两个独立 HTML 旧备份也已按用户要求删除。

驾驶与 AI 的共享计算位于 dynamics.js，主场景和渲染位于 index.html。涉及波高时同时更新 CPU 波高函数和 GPU waterHeight。修改驾驶、设施导航或赛道几何后执行 tests/game.test.cjs，并根据改动做有针对性的浏览器视觉检查。

水道高差、宽度与流速由 dynamics.js 的 channelField、baseWaterHeight 和 channelGLSL 共同定义。HW 只表示最大半宽；局部几何、碰撞和导航使用 halfWidthAt、laneLimitAt，设施高度使用局部基准水位。inspect 预览包含实际 GPU/CPU 波高采样校验。修改地形后也检查 tests/balance.test.cjs 中的可获胜参考路线，不直接沿用旧平地成绩。

地图参数与隧道区间位于 maps.js，都市楼宇与隧道壳体位于 city.js。Neon City 的物理实例通过 MapCatalog.channel 生成，保持 CPU/GPU 隧道收窄参数一致。新增城市模型必须避让水道；检查 tests/maps.test.cjs 中的设施间距、顶棚和可获胜路线。调整场景后更新实景预览缓存版本。

2026-09-19 修复远处路灯水面照明后，按用户授权删除此前 12 个 ZIP 旧备份，仅保留 2026-09-19-221357-before-static-water-lighting.zip；这些旧备份无需恢复。后续备份仍按默认规则保留。
