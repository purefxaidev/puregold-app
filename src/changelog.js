/** Embedded release notes (offline). Keys: version without leading v. Bodies: th/en/zh (ja falls back to en). */
export const CHANGELOG = [
  {
    version: '0.9.8',
    date: '2026-11-11',
    th: [
      'แผนเทรดจากโต๊ะวิเคราะห์ (จุดเข้า / SL / TP1–TP3 / อัตราส่วนเสี่ยง) อัปเดตสถานะตามราคาสด พร้อมแจ้งเตือนเมื่อเข้าแล้ว ชน TP หรือโดน SL',
      'แสดงเวอร์ชันที่ติดตั้งบนหน้า Home และในตั้งค่า และตรวจอัปเดตจากเว็บ PureGold — ถ้าเป็นเวอร์ชั่นล่าสุดแล้วจะขึ้นว่า เวอร์ชั่นล่าสุดแล้ว',
      'แนวเอียง S/R คำนวณจากราคาสดเทียบแนวรับแนวต้านรายวัน',
    ],
    en: [
      'The desk trade plan (entry / stop / TP1–TP3 / risk:reward) follows the live price, with alerts when the plan is entered, hits TP, or hits the stop',
      'The installed version is shown on Home and in Settings, with an update check from the PureGold site — if you are current it says you already have the latest version',
      'Support/resistance bias is computed from the live mid against daily levels',
    ],
    zh: [
      '分析台交易计划（进场 / 止损 / TP1–TP3 / 盈亏比）随实时价格更新，进场、触及 TP 或止损时提醒',
      '首页与设置显示已安装版本，并从 PureGold 网站检查更新 — 已是最新时会显示已是最新版本',
      '支撑/阻力偏向按实时中间价与日线水平计算',
    ],
    ja: [
      'デスクのトレードプラン（エントリー / SL / TP1–TP3 / リスクリワード）をライブ価格で更新し、参入・TP・ストップを通知',
      'ホームと設定にインストール済みバージョンを表示し、PureGoldサイトで更新を確認 — 最新なら「最新バージョンです」と表示',
      'サポート/レジスタンスのバイアスをライブ中値と日足レベルから計算',
    ],
  },
  {
    version: '0.9.7',
    date: '2026-11-11',
    th: [
      'เพิ่มปุ่ม «ติดต่อผู้พัฒนาผ่าน LINE» ในเมนูตั้งค่าและการสนับสนุน เปิดแชท LINE ของ PureFxAi',
    ],
    en: [
      'Added a “Contact the developer on LINE” button in Settings and Support that opens the PureFxAi LINE chat',
    ],
    zh: [
      '在设置与支持中新增“通过 LINE 联系开发者”按钮，打开 PureFxAi 的 LINE 聊天',
    ],
    ja: [
      '設定とサポートに「LINEで開発者に連絡」ボタンを追加し、PureFxAi の LINE チャットを開く',
    ],
  },
  {
    version: '0.9.6',
    date: '2026-11-10',
    th: [
      'หน้า Home แสดงผลตอบแทนทองคำ XAUUSD 1 สัปดาห์ 1 เดือน 3 เดือน ปีนี้ และ 1 ปี สีเขียวเมื่อบวก สีแดงเมื่อลบ จากราคาปิดรายวันจริง',
      'ราคาและระยะแนวรับแนวต้านรีเฟรชจากสปอตสดทุกไม่กี่วินาที ไม่ยึดมุมมองเก่าเมื่อราคาผ่านจุดพิวอตแล้ว',
    ],
    en: [
      'Home shows XAUUSD performance for 1 week, 1 month, 3 months, year to date, and 1 year — green when up, red when down — from real daily closes',
      'Price and support/resistance distances refresh from the live mid every few seconds, and no longer keep a stale bias after price has moved through the pivot',
    ],
    zh: [
      '首页显示 XAUUSD 一周、一个月、三个月、年初至今和一年涨跌，上涨绿色、下跌红色，依据真实日收盘',
      '价格与支撑/阻力距离随实时中间价数秒刷新，价格穿过枢轴后不再沿用过时偏向',
    ],
    ja: [
      'ホームに XAUUSD の1週間・1か月・3か月・年初来・1年の騰落を表示。プラスは緑、マイナスは赤。実際の日足終値を使用',
      '価格とサポレジ距離を数秒ごとにライブ中値で更新し、ピボットを越えたあとに古いバイアスを残さない',
    ],
  },
  {
    version: '0.9.5',

    date: '2026-11-10',
    th: [
      'แจ้งเตือนเมื่อสปอต XAUUSD (Swissquote) แตะหรือเบรกแนวรับ S1–S3 / แนวต้าน R1–R3 จากแดชบอร์ด พร้อมคูลดาวน์และสวิตช์ในตั้งค่า',
      'แจ้งล่วงหน้าประมาณ 15 นาทีก่อนข่าว USD ผลกระทบสูง (ปฏิทินแดชบอร์ด หรือ Forex Factory หากไฟล์นั้นยังไม่ขึ้น)',
      'การ์ด SPDR บนหน้า Home แสดงการถือครองและการซื้อขายล่าสุดจากคลังข้อมูลทางการ',
    ],
    en: [
      'Alerts when XAUUSD (Swissquote spot) touches or breaks dashboard S1–S3 / R1–R3, with a cooldown and a Settings toggle',
      'A heads-up about 15 minutes before high-impact USD events (dashboard calendar, or Forex Factory if that feed is not up yet)',
      'A compact SPDR card on Home shows the latest official holdings and daily flow',
    ],
    zh: [
      'XAUUSD（Swissquote 现货）触及或突破看板 S1–S3 / R1–R3 时提醒，可设置冷却并在设置中开关',
      '高影响美元事件前约 15 分钟提醒（看板日历；若尚未上线则用 Forex Factory）',
      '首页 SPDR 卡片显示最新官方持仓与流向',
    ],
    ja: [
      'XAUUSD（Swissquoteスポット）がダッシュボードのS1–S3 / R1–R3にタッチまたはブレイクしたら通知。クールダウンと設定のスイッチ付き',
      '米ドル重要指標の約15分前に通知（ダッシュボードのカレンダー、未公開時はForex Factory）',
      'ホームのSPDRカードで最新の公式保有とフローを表示',
    ],
  },
  {
    version: '0.9.4',
    date: '2026-11-10',
    th: [
      'การ์ด “คำแนะนำตอนนี้” จากแดชบอร์ด แสดงบนหน้า Home — สถานะเทรดอัตโนมัติ, ตอนนี้ซื้อ/ขาย/รอ พร้อมเหตุผล, มุมมอง AI ขึ้น/ลง, แถบโซนซื้อ–ขาย และแผนสองกรณี',
      'แตะคำ SL / TP / RR / EV เพื่อดูความหมาย · แสดงความแม่นยำ AI 7 วัน และ 30 วัน',
      'ราคา XAUUSD ใช้สปอต FX จริง ไม่แสดงราคา PAXG ดิบ — ทั้งหน้าโฮม หน้าต่างลอย บับเบิล วิดเจ็ต และการแจ้งเตือน',
    ],
    en: [
      'The dashboard “Recommendation now” card is on Home — auto-trade status, now BUY/SELL/WAIT with a reason, AI up/down view, buy–sell zone bar, and both scenario plans',
      'Tap SL / TP / RR / EV for short glossary meanings · AI accuracy for 7 days and 30 days is shown on the card',
      'XAUUSD uses a real FX mid, never raw PAXG — on Home, the overlay and bubble, the widget, and alerts',
    ],
    zh: [
      '首页新增看板的“此刻建议”卡片：自动交易状态、买入/卖出/等待及理由、AI 看涨/看跌、买卖区间条与两套情景计划',
      '点击 SL / TP / RR / EV 可查看释义 · 显示 AI 7 日与 30 日准确率',
      'XAUUSD 使用真实外汇中间价，不再把原始 PAXG 当作金价 — 首页、悬浮窗/气泡、小组件与提醒均已统一',
    ],
    ja: [
      'ダッシュボードの「今の推奨」カードをホームに表示 — 自動売買の状態、今の買い/売り/待ちと理由、AIの上下見通し、売買ゾーンバー、2つのシナリオ',
      'SL / TP / RR / EV をタップして用語の意味を表示 · AI精度（7日/30日）も表示',
      'XAUUSDは実際のFXミッドを使用し、生のPAXGは表示しません（ホーム、オーバーレイ/バブル、ウィジェット、アラート）',
    ],
  },
  {
    version: '0.9.3',
    date: '2026-11-10',
    th: [
      'หน้าต่างลอยย่อเป็นบับเบิลกลมได้ (แบบแชทเฮด) — กดปุ่ม “ย่อ” บนการ์ด',
      'ลากบับเบิลไปที่ไหนก็ได้ ดูดติดขอบจอ กดเพื่อขยายกลับ · ลากไปที่ X ด้านล่างเพื่อปิด',
      'บับเบิลแสดงราคาไลฟ์สั้นๆ และวงแหวน/จุดตามสัญญาณ · จำสถานะกับตำแหน่งไว้',
      'ราคาและสัญญาณอัปเดตต่อเนื่องทั้งโหมดการ์ดและบับเบิล',
      'PureFxAi ใช้ได้ทันที ไม่ต้องใส่คีย์ — แชท แผน วิเคราะห์ข่าว (คีย์เสริมในตั้งค่าสำหรับเสียงคลาวด์)',
    ],
    en: [
      'Floating overlay minimizes to a round chat-head bubble — tap Min on the card',
      'Drag the bubble anywhere; it snaps to the nearest edge. Tap to expand. Drag to the bottom X to close',
      'Bubble shows a tiny live price and a signal-colored ring/dot, and remembers state and position',
      'Live price and signal updates keep running in both the card and the bubble',
      'PureFxAi works out of the box — no key needed for chat, plan, and news analysis (optional key in Settings for cloud voices)',
    ],
    zh: [
      '悬浮窗可缩小为圆形聊天气泡 — 点击卡片上的“缩小”',
      '可拖到任意位置并吸附边缘，点按展开，拖到底部 X 关闭',
      '气泡显示实时短价和信号色环/点，并记住状态与位置',
      '卡片与气泡两种状态下价格和信号持续更新',
      'PureFxAi 开箱即用，聊天/计划/新闻分析无需密钥（设置中可选密钥用于云端语音）',
    ],
    ja: [
      'フローティングを丸いチャットヘッド風バブルに最小化（カードの「Min」）',
      'ドラッグして端にスナップ、タップで展開、下部のXへドラッグして閉じる',
      'バブルにライブ価格とシグナル色のリング/ドットを表示し、状態と位置を記憶',
      'カードとバブルの両方で価格・シグナルの更新が続く',
      'PureFxAiはキーなしですぐ使えます（チャット・計画・ニュース）。クラウド音声は設定の任意キー',
    ],
  },
  {
    version: '0.9.2',
    date: '2026-11-06',
    th: [
      'ขัด UI แอปให้หรูขึ้น — โทนทอง glass/glow การ์ดและตัวอักษรคมขึ้น',
      'หน้าเว็บ PureGold (landing) อลังการขึ้น พร้อมดาวน์โหลด APK 0.9.2',
      'คงฟีเจอร์เดิมครบ: กราฟ เทคนิค ข่าว PureFxAi แผน แชท วิดเจ็ต หน้าต่างลอย',
    ],
    en: [
      'Premium UI polish — gold glass/glow, sharper cards and typography',
      'PureGold landing page refreshed with APK 0.9.2 download',
      'All prior features kept: chart, techniques, news, PureFxAi, plan, chat, widget, overlay',
    ],
    zh: [
      '界面高级打磨 — 金色玻璃光晕、卡片与字体更精致',
      'PureGold 落地页同步更新并提供 0.9.2 APK',
      '保留全部既有功能：图表、技法、新闻、PureFxAi、计划、聊天、小组件、悬浮窗',
    ],
    ja: [
      'UIを高級感あるゴールドのガラス/グロウに磨き上げ',
      'PureGoldランディングも更新し APK 0.9.2 を配布',
      'チャート・手法・ニュース・PureFxAi・プラン・チャット・ウィジェット・オーバーレイは維持',
    ],
  },
  {
    version: '0.9.1',
    date: '2026-11-06',
    th: [
      'ข่าวแสดงข้อความสะอาด ไม่โชว์โค้ด HTML หรือลิงก์ดิบ',
      'ปุ่ม “เปิดข่าว” เปิดลิงก์ต้นทางชัดเจน',
      'เมื่อตั้งภาษาไทย/จีน/ญี่ปุ่น จะแปลพาดหัวและสรุปสั้น (ใช้ข้อความจากฟีด หรือ PureFxAi เมื่อมีคีย์)',
      'ลบโค้ดดาวน์โหลดโมเดลในเครื่องที่ไม่ได้ใช้แล้ว (ยังมีปุ่มล้างไฟล์เก่าคืนพื้นที่)',
    ],
    en: [
      'News cards show clean text — no raw or escaped HTML',
      'A clear “Open link” button opens the source article',
      'Thai / Chinese / Japanese headlines and short summaries (feed text, or PureFxAi when an API key is set)',
      'Removed unused on-device model download code (cleanup button still wipes leftover packs)',
    ],
    zh: [
      '新闻卡片只显示干净文本，不再出现原始或转义 HTML',
      '“打开原文”按钮可打开来源链接',
      '应用为中/泰/日文时显示对应标题与摘要（来自源或 PureFxAi）',
      '移除已不用的本机模型下载代码（清理按钮仍可删除旧包）',
    ],
    ja: [
      'ニュース本文から生HTML/エスケープ済みマークアップを除去',
      '「記事を開く」ボタンで出典を表示',
      'アプリ言語が日/泰/中のとき見出しと短い要約を表示（フィード文または PureFxAi）',
      '未使用の端末モデルダウンロード処理を削除（クリーンアップで旧パックを削除可能）',
    ],
  },
  {
    version: '0.9.0',
    date: '2026-11-06',
    th: [
      'กราฟและเทคนิคอยู่หน้าแรกแล้ว (กดเต็มหน้าได้)',
      'ข่าวล่าสุดจากหลายแหล่ง + PureFxAi วิเคราะห์ผลต่อทอง (น้องหมี)',
      'แจ้งเตือนเมื่อข่าวมีผลแรงต่อทอง (เปิด/ปิดได้ในตั้งค่า)',
      'หน้าต่างลอยอ่านง่าย อัปเดตราคาจริงตามเวลา · วิดเจ็ตหน้าจอหลักแสดง XAU/ทองไทย/สัญญาณ',
    ],
    en: [
      'Chart and Techniques now live on Home (open full page anytime)',
      'Latest multi-source gold news + PureFxAi impact analysis (Nong Mee)',
      'SMS-style alerts when a headline strongly moves gold (toggle in Settings)',
      'Floating overlay stays on-screen and refreshes live · home-screen widget for XAU/Thai gold/signal',
    ],
    zh: [
      '图表与技法已放到首页（可打开全页）',
      '多源最新黄金新闻 + PureFxAi 影响分析（小熊）',
      '对金价影响较强的新闻会弹出通知（可在设置开关）',
      '悬浮窗对齐并实时刷新 · 主屏小组件显示 XAU/泰国金/信号',
    ],
    ja: [
      'チャートと手法をホームに配置（全画面も可）',
      '複数ソースの最新金ニュース + PureFxAi分析（くまちゃん）',
      '金に強く影響する見出しは通知（設定で切替）',
      'フローティングを画面内に収めライブ更新 · ホームウィジェットで価格とシグナル',
    ],
  },
  {
    version: '0.8.1',
    date: '2026-11-06',
    th: [
      'เมนูข่าวกลับมาที่แถบล่าง — เห็นชัดขึ้น (กราฟย้ายไปเมนูเพิ่ม)',
      'เสียง PureFxAi เล่นจากคลาวด์ได้จริง ไม่สลับไปเสียงเครื่องโดยไม่บอก',
      'แจ้งเตือนเคารพช่วงเวลาที่ตั้งในตั้งค่า ไม่เด้งซ้ำถี่ๆ',
    ],
    en: [
      'News is back on the bottom nav (Chart moved into More)',
      'PureFxAi cloud voice plays correctly instead of silently using device TTS',
      'Alerts honor the Settings interval and stop repeating so often',
    ],
    zh: [
      '新闻重新回到底部菜单（图表移入“更多”）',
      'PureFxAi 云端语音可正常播放，不再悄悄改用系统语音',
      '通知遵守设置间隔，不再频繁重复弹出',
    ],
    ja: [
      'ニュースを下部メニューに再表示（チャートはその他へ）',
      'PureFxAiクラウド音声が正しく再生されます',
      '通知が設定の間隔を守り、頻繁に繰り返さなくなりました',
    ],
  },
  {
    version: '0.8.0',
    date: '2026-11-06',
    th: [
      'PureFxAi ใช้ API key ฟรี (วางในตั้งค่า) — ไม่โหลดแพ็กโมเดลในเครื่องแล้ว (แก้แฮง)',
      'แชท + วิเคราะห์แผนผ่าน PureFxAi ออนไลน์ · มีตัวเลือกเสียงหลายแบบ (คลาวด์/เครื่อง)',
      'ประวัติสัญญาณพร้อม % ความแม่นยำ · แจ้งเตือนป๊อปอัปแบบ SMS',
      'ย่อเมนูล่าง · เต็มจอสม่ำเสมอ · ไอคอนแอปใหม่ (bull/bear)',
    ],
    en: [
      'PureFxAi via free API key in Settings — no on-device model pack (fixes hangs)',
      'Chat + plan analysis online · multiple PureFxAi voice options (cloud / device)',
      'Signal history with accuracy % · SMS-style heads-up alerts',
      'Simpler nav · consistent full-screen · new bull/bear app icon',
    ],
    zh: [
      'PureFxAi 使用设置中的免费 API 密钥 — 不再本机下载模型包（修复卡顿）',
      '在线聊天与计划分析 · 多种 PureFxAi 语音（云端/本机）',
      '信号历史含准确率% · 短信式抬头通知',
      '精简菜单 · 统一满屏 · 新牛熊应用图标',
    ],
  },
  {
    version: '0.7.0',
    date: '2026-11-06',
    th: [
      'แพ็ก PureFxAi บนเครื่องเล็กลง (~0.5 GB) ติดตั้งเร็วขึ้น — แบรนด์ PureFxAi เท่านั้น',
      'ลบ / ถอน PureFxAi ออกจากเครื่องได้จากเมนูแผน เพื่อคืนพื้นที่ แล้วติดตั้งใหม่ได้',
      'UI เต็มจอขึ้น — ลดขอบ/ช่องว่าง แชทและแผนใช้พื้นที่มากขึ้น',
    ],
    en: [
      'Smaller on-device PureFxAi pack (~0.5 GB) — faster install; PureFxAi branding only',
      'Delete / uninstall PureFxAi from the phone (Plan tab) to free storage; reinstall anytime',
      'Fuller-screen UI — less padding/chrome; chat and plan use more of the display',
    ],
    zh: [
      '更小的本机 PureFxAi 包（约 0.5 GB），安装更快；界面仅显示 PureFxAi',
      '可在计划页删除/卸载本机 PureFxAi 以释放空间，之后可重新安装',
      '更满屏界面 — 减少边距，聊天与计划占用更多屏幕',
    ],
  },
  {
    version: '0.6.0',
    date: '2026-11-06',
    th: [
      'แชทบอท PureFxAi ในแอป — พิมพ์คุยได้ พูดทวนคำตอบ (TTS ไทย/อังกฤษ/จีน)',
      'แนะนำแผนเทรดจากกฎ + PureFxAi และสอนสมัคร Exness (ลิงก์ partner ในแอป)',
      'คำเตือนเล็กๆ ในแชทและ README: การลงทุนมีความเสี่ยง / Investing involves risk / 投资有风险',
    ],
    en: [
      'In-app PureFxAi chat bot — type to chat; spoken replies (TTS TH/EN/ZH)',
      'Trading guidance from rules + PureFxAi, plus Exness signup help (in-app partner link)',
      'Small risk disclaimer in chat and README: Investing involves risk',
    ],
    zh: [
      '应用内 PureFxAi 聊天机器人 — 可打字对话，并朗读回复（TTS 泰/英/中）',
      '基于规则 + PureFxAi 的交易指引，以及 Exness 注册引导（应用内合作链接）',
      '聊天与 README 中的小字风险提示：投资有风险',
    ],
  },
  {
    version: '0.5.0',
    date: '2026-11-06',
    th: [
      'วิเคราะห์แผนด้วย PureFxAi ในเครื่อง (ติดตั้งอัตโนมัติครั้งแรก — แสดง “กำลังติดตั้ง” พร้อมเปอร์เซ็นต์)',
      'เมนูแผนยังใช้กฎเทคนิคเป็นฐาน แล้วเสริมด้วย PureFxAi',
      'ไม่แสดงชื่อโมเดลภายนอกใน UI — ใช้แบรนด์ PureFxAi เท่านั้น',
    ],
    en: [
      'On-device PureFxAi plan analysis (auto-install on first use — “Installing…” with progress %)',
      'Plan tab keeps the rule engine as baseline, enhanced by PureFxAi',
      'No third-party model names in the UI — branded PureFxAi only',
    ],
    zh: [
      '本机 PureFxAi 计划分析（首次自动安装 — 显示“正在安装”与进度百分比）',
      '计划页保留规则引擎为基础，并由 PureFxAi 增强',
      '界面不显示外部模型名称 — 仅使用 PureFxAi 品牌',
    ],
  },
  {
    version: '0.4.0',
    date: '2026-11-06',
    th: [
      'เมนูแผนแยก — สรุปแผนวันนี้ (เข้า / SL / TP / ระดับสำคัญ) อ่านจบเร็ว',
      'แสดงรายละเอียดอัปเดตแต่ละเวอร์ชันในแอป (ออฟไลน์ + จาก GitHub)',
      'วิดเจ็ตหน้าจอหลัก — ราคาทองไทย (ฮั่วเซ่งเฮง) / XAU + สัญญาณสั้น',
      'หน้าต่างลอยทับแอปอื่น (เช่น MT5) — ราคา + สัญญาณ + แผนย่อ (ต้องอนุญาตแสดงทับแอปอื่น)',
      'ประวัติสัญญาณ Buy/Sell ในเครื่อง พร้อมผลลัพธ์โดยประมาณเทียบราคาภายหลัง',
    ],
    en: [
      'Dedicated Plan tab — today’s plan card (entry / SL / TP / key levels) in ~10 seconds',
      'In-app per-version changelog (offline notes + GitHub release body)',
      'Home-screen widget — Thai HSH gold / XAU + short signal',
      'Floating overlay over other apps (e.g. MT5) — price + signal + tiny plan (needs “Display over other apps” permission)',
      'On-device Buy/Sell signal history with best-effort outcome vs later price',
    ],
    zh: [
      '独立「计划」菜单 — 今日计划卡片（入场 / 止损 / 止盈 / 关键位）快速可读',
      '应用内按版本更新说明（离线 + GitHub）',
      '主屏小组件 — 泰国金 / XAU + 简短信号',
      '悬浮窗覆盖其他应用（如 MT5）— 价格 + 信号 + 简要计划（需「显示在其他应用上层」权限）',
      '本机 Buy/Sell 信号历史，并尽量对照后续价格标记结果',
    ],
  },
  {
    version: '0.3.2',
    date: '2026-11-06',
    th: [
      'UI และคู่มือสมัคร Exness ครบไทย / จีน / อังกฤษ',
      'เมนูวิเคราะห์แยกตามเทคนิค',
      'ตัด DriftWatch Video ออกจากแอป',
    ],
    en: [
      'Full TH / ZH / EN UI and Exness sign-up guide',
      'Techniques analysis menu',
      'Removed DriftWatch Video from the app',
    ],
    zh: [
      '完整泰/中/英界面与 Exness 注册教程',
      '技法分析菜单',
      '从应用中移除 DriftWatch Video',
    ],
  },
  {
    version: '0.3.1',
    date: '2026-11-05',
    th: ['เมนูเทคนิค', 'ปรับแบรนด์ DriftWatch'],
    en: ['Techniques menu', 'DriftWatch branding cleanup'],
    zh: ['技法菜单', '清理 DriftWatch 品牌'],
  },
  {
    version: '0.3.0',
    date: '2026-11-05',
    th: [
      'UI โปรดักชัน + หลายภาษา',
      'SMC Order Block / FVG',
      'จุดเข้า–ออก และแจ้งเตือนราคา',
      'ตรวจอัปเดตจาก GitHub',
    ],
    en: [
      'Production UI + multi-language',
      'SMC Order Blocks & FVG',
      'Entry/exit setup and price alerts',
      'GitHub update check',
    ],
    zh: [
      '生产级界面 + 多语言',
      'SMC 订单块与 FVG',
      '进出场与价格提醒',
      'GitHub 更新检查',
    ],
  },
];

export function notesFor(version, lang) {
  const v = String(version || '').replace(/^v/i, '');
  const row = CHANGELOG.find(x => x.version === v);
  if (!row) return [];
  return row[lang] || row.en || [];
}

export function allVersions() {
  return CHANGELOG.map(x => x.version);
}
