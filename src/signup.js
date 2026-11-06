/** Exness signup wizard. Partner code s2didh6p. Full TH / ZH / EN. */
export const EXNESS_REF = 'https://one.toexness.com/a/s2didh6p';
export const EXNESS_WEB_GUIDE = 'https://purefxaidev.github.io/gold-dashboard/signup.html';

const EXT = `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>`;

const CTA = {
  en: {
    open: 'Open the Exness sign-up page',
    login: 'Log in to Exness to open an account',
    qr: 'Scan to open the same partner link<br>Partner referral · code s2didh6p',
  },
  th: {
    open: 'เปิดหน้าสมัคร Exness',
    login: 'เข้าสู่ระบบ Exness เพื่อเปิดบัญชี',
    qr: 'สแกนเพื่อเปิดลิงก์ partner เดียวกัน<br>ลิงก์แนะนำ · รหัส s2didh6p',
  },
  zh: {
    open: '打开 Exness 注册页',
    login: '登录 Exness 以开户',
    qr: '扫码打开同一合作链接<br>合作推荐 · 代码 s2didh6p',
  },
};

function ctaHtml(lang, which = 'open') {
  const C = CTA[lang] || CTA.en;
  const label = which === 'login' ? C.login : C.open;
  return `<button type="button" class="cta" data-ex-open="1">${label} ${EXT}</button>
 <div class="qr-row"><img src="/exness-qr.png" alt="Exness QR"><div>${C.qr}</div></div>`;
}

const STEPS = {
  en: [
    { t: 'Open the link and register', b: `<ol><li>Tap the button below to open the Exness website</li><li>Tap Register / Sign up (the button name may differ slightly)</li><li>Choose your country of residence</li><li>Enter an email you actually use and set a strong password (upper and lower case, numbers and symbols)</li><li>Read the terms, then confirm your registration</li></ol>
      <div class="tip">Use an email and password you don't use elsewhere, and never share your password with anyone, including AI assistants.</div>${ctaHtml('en')}`,
      c: ['Opened the sign-up link', 'Entered email, country and password'] },
    { t: 'Verify email and phone', b: `<ol><li>Open the email from Exness and enter the verification code (check spam/promotions if you can't find it)</li><li>You may be asked for a mobile number; enter the SMS code correctly</li><li>Turn on two-step verification if offered</li></ol><div class="tip">Codes expire quickly. If one expires, request a new one.</div>`,
      c: ['Email verified', 'Phone verified'] },
    { t: 'Complete profile and verify identity (KYC)', b: `<ol><li>Enter personal details exactly as on your ID card or passport (name, date of birth, address)</li><li>Upload an ID document: national ID card or passport</li><li>You may be asked for a selfie or face video to match the document</li><li>Proof of address: e.g. a utility bill or bank statement showing the same name and address (within the allowed age)</li></ol>
      <div class="tip">To pass quickly: shoot in good light with no glare, all 4 corners visible, sharp text, no editing, and the same spelling of your name everywhere.</div><div class="tip">Review can take from a few minutes to several hours. You can do some of the next steps meanwhile.</div>`,
      c: ['Profile completed', 'Uploaded ID/passport and selfie', 'Uploaded proof of address'] },
    { t: 'Choose an account type', b: `<ul><li><b>Standard Cent (USC)</b>: good for beginners. The balance is shown in cents, so you can trade real money in small amounts with smaller risk per trade.</li><li><b>Standard</b>: the basic USD account, for when you understand risk management.</li><li>Always try a <b>Demo account</b> first.</li></ul>
      <div class="tip">Account names and conditions (spread, commission, minimum deposit) can change. Check on the Exness website before choosing.</div>${ctaHtml('en', 'login')}`,
      c: ['Tried a Demo account', 'Opened a real account that suits me'] },
    { t: 'Deposit', b: `<ol><li>In your account area, choose Deposit (the name may differ slightly)</li><li>Pick a payment method available in your country, such as bank transfer, QR payment or others (methods and fees may change)</li><li>Enter the amount and follow the on-screen steps</li><li>The bank account you pay from should be in your own name</li></ol>
      <div class="warn">Start with a small amount you can afford to lose completely. Never use borrowed money or money you need to live on.</div>`,
      c: ['Deposited an amount I can afford to lose'] },
    { t: 'Install the app or use the web terminal', b: `<ul><li><b>Mobile:</b> install the Exness trading app from the App Store / Google Play (check the developer really is Exness)</li><li><b>Computer:</b> use the Web Terminal in your browser, or MetaTrader 5</li><li>Log in with your trading account and check you picked the right one (Demo or real)</li></ul><div class="tip">Beware of fake websites and apps. Only use official links or app stores.</div>`,
      c: ['Installed the app / opened the Web Terminal', 'Logged in to my trading account'] },
    { t: 'Find XAUUSD and open your first trade', b: `<ol><li>Search for the symbol <b>XAUUSD</b> (gold)</li><li>Check PUREGOLD analysis in this app: bias, entry zone, SL and TP</li><li>Use a small lot size, e.g. 0.01–0.1 (Cent account)</li><li><b>Always set SL and TP</b> before confirming the order</li><li>Double-check every value, then confirm</li></ol>
      <div class="tip">SL = automatic stop loss · TP = automatic take profit · If unsure, practise on Demo first.</div>`,
      c: ['Found XAUUSD', 'Opened my first trade with SL and TP'] },
    { t: 'Risk management rules', b: `<ul><li>Risk no more than 1–2% of your account per trade</li><li>Every trade needs SL and TP · reward-to-risk (RR) of at least 1.5</li><li>Never average down a losing trade and never move your SL further away</li><li>Don't open new trades 15–30 minutes before and after major news (CPI, NFP, FOMC)</li><li>After 3 losses in a row or a 10% drawdown, stop for the day</li><li>Journal every trade to learn from mistakes</li></ul>
      <div class="warn">No system or AI can guarantee profits. Trading is high risk.</div>`,
      c: ['I understand and will follow the risk rules'] },
  ],
  th: [
    { t: 'เปิดลิงก์และลงทะเบียน', b: `<ol><li>กดปุ่มด้านล่างเพื่อเปิดหน้าเว็บ Exness</li><li>กดปุ่มลงทะเบียน/สมัครสมาชิก (ชื่อปุ่มอาจต่างกันเล็กน้อย)</li><li>เลือกประเทศที่พำนัก</li><li>กรอกอีเมลที่ใช้งานจริง และตั้งรหัสผ่านที่เดายาก (ผสมตัวพิมพ์ใหญ่ เล็ก ตัวเลข และสัญลักษณ์)</li><li>อ่านเงื่อนไข แล้วกดยืนยันการสมัคร</li></ol>
      <div class="tip">ใช้อีเมลและรหัสผ่านที่ไม่ซ้ำกับบริการอื่น และห้ามบอกรหัสผ่านกับใคร รวมถึงผู้ช่วย AI</div>${ctaHtml('th')}`,
      c: ['เปิดลิงก์สมัครแล้ว', 'กรอกอีเมล ประเทศ และรหัสผ่านเรียบร้อย'] },
    { t: 'ยืนยันอีเมลและเบอร์โทร', b: `<ol><li>เปิดอีเมล หาข้อความจาก Exness แล้วนำรหัสยืนยันไปกรอก (ถ้าไม่เจอให้ดูในโฟลเดอร์สแปม/โปรโมชัน)</li><li>ระบบอาจขอเบอร์มือถือ ให้รับรหัส SMS แล้วกรอกให้ถูกต้อง</li><li>แนะนำให้เปิดการยืนยันตัวตน 2 ขั้นตอน (ถ้ามีให้เลือก)</li></ol><div class="tip">รหัสยืนยันมักมีอายุสั้น ถ้าหมดอายุให้กดขอรหัสใหม่</div>`,
      c: ['ยืนยันอีเมลแล้ว', 'ยืนยันเบอร์โทรแล้ว'] },
    { t: 'กรอกโปรไฟล์และยืนยันตัวตน (KYC)', b: `<ol><li>กรอกข้อมูลส่วนตัวให้ตรงกับบัตรประชาชน/พาสปอร์ต (ชื่อ-นามสกุลภาษาอังกฤษ วันเกิด ที่อยู่)</li><li>อัปโหลดเอกสารยืนยันตัวตน: บัตรประชาชน หรือ พาสปอร์ต</li><li>ระบบอาจขอถ่ายเซลฟี่/วิดีโอใบหน้าเพื่อเทียบกับเอกสาร</li><li>เอกสารยืนยันที่อยู่: เช่น บิลค่าน้ำ ค่าไฟ หรือ statement ธนาคาร ที่มีชื่อและที่อยู่ตรงกับที่กรอก (อายุเอกสารตามที่ระบบกำหนด)</li></ol>
      <div class="tip">เคล็ดลับให้ผ่านเร็ว: ถ่ายในที่สว่าง ไม่มีแสงสะท้อน เห็นมุมเอกสารครบ 4 มุม ตัวอักษรชัด ไม่ตัดต่อ และชื่อสะกดตรงกันทุกที่</div><div class="tip">การตรวจสอบอาจใช้เวลาตั้งแต่ไม่กี่นาทีถึงหลายชั่วโมง ระหว่างนี้ทำขั้นตอนถัดไปบางส่วนได้</div>`,
      c: ['กรอกโปรไฟล์ครบ', 'อัปโหลดบัตร/พาสปอร์ตและเซลฟี่แล้ว', 'อัปโหลดเอกสารยืนยันที่อยู่แล้ว'] },
    { t: 'เลือกประเภทบัญชี', b: `<ul><li><b>Standard Cent (หน่วย USC)</b>: เหมาะกับมือใหม่ ยอดเงินแสดงเป็นเซนต์ ทำให้ทดลองเทรดด้วยเงินจริงจำนวนน้อยได้ ความเสี่ยงต่อไม้เล็กลง</li><li><b>Standard</b>: บัญชีพื้นฐานหน่วยดอลลาร์ เหมาะเมื่อเข้าใจการบริหารความเสี่ยงแล้ว</li><li>แนะนำให้ลอง <b>บัญชีทดลอง (Demo)</b> ก่อนเสมอ</li></ul>
      <div class="tip">ชื่อและเงื่อนไขของบัญชีแต่ละประเภท (สเปรด ค่าคอมมิชชั่น เงินฝากขั้นต่ำ) อาจเปลี่ยนได้ ให้ตรวจสอบบนเว็บ Exness ก่อนเลือก</div>${ctaHtml('th', 'login')}`,
      c: ['ลองบัญชี Demo แล้ว', 'เปิดบัญชีจริงประเภทที่เหมาะกับตัวเองแล้ว'] },
    { t: 'ฝากเงิน', b: `<ol><li>ในหน้าบัญชี เลือกเมนูฝากเงิน (ชื่ออาจต่างกันเล็กน้อย)</li><li>เลือกวิธีฝากที่มีในประเทศของคุณ เช่น โอนธนาคาร, QR หรือช่องทางอื่น (วิธีและค่าธรรมเนียมอาจเปลี่ยนแปลงได้)</li><li>ใส่จำนวนเงินและทำรายการตามขั้นตอนบนหน้าจอ</li><li>บัญชีธนาคารที่ใช้โอนควรเป็นชื่อเดียวกับผู้สมัคร</li></ol>
      <div class="warn">เริ่มด้วยเงินจำนวนน้อยที่เสียได้ทั้งหมด อย่าใช้เงินกู้หรือเงินที่จำเป็นต่อการใช้ชีวิต</div>`,
      c: ['ฝากเงินจำนวนที่ยอมเสียได้แล้ว'] },
    { t: 'ติดตั้งแอปหรือใช้เว็บเทรด', b: `<ul><li><b>มือถือ:</b> ติดตั้งแอปเทรดของ Exness จาก App Store / Google Play (ตรวจสอบว่าผู้พัฒนาคือ Exness จริง)</li><li><b>คอมพิวเตอร์:</b> ใช้ Web Terminal ผ่านเบราว์เซอร์ หรือ MetaTrader 5</li><li>ล็อกอินด้วยบัญชีเทรดที่เปิดไว้ และตรวจว่าเลือกบัญชีถูก (Demo หรือ บัญชีจริง)</li></ul><div class="tip">ระวังเว็บ/แอปปลอม เข้าผ่านลิงก์ทางการหรือร้านค้าแอปเท่านั้น</div>`,
      c: ['ติดตั้งแอป/เปิด Web Terminal แล้ว', 'ล็อกอินบัญชีเทรดได้'] },
    { t: 'หา XAUUSD และเปิดไม้แรก', b: `<ol><li>ค้นหาสัญลักษณ์ <b>XAUUSD</b> (ทองคำ) ในรายการสินค้า</li><li>ดูการวิเคราะห์จากแอป PUREGOLD: มุมมอง โซนเข้า SL และ TP</li><li>ตั้งขนาดล็อตเล็กๆ เช่น 0.01–0.1 (บัญชี Cent)</li><li><b>ต้องตั้ง SL และ TP ทุกครั้ง</b> ก่อนกดยืนยันคำสั่ง</li><li>ตรวจทานทุกค่าอีกครั้ง แล้วจึงยืนยัน</li></ol>
      <div class="tip">SL = จุดตัดขาดทุนอัตโนมัติ · TP = จุดรับกำไรอัตโนมัติ · ถ้าไม่แน่ใจ ลองบนบัญชี Demo ก่อน</div>`,
      c: ['หา XAUUSD เจอแล้ว', 'เปิดไม้แรกพร้อม SL และ TP แล้ว'] },
    { t: 'กฎบริหารความเสี่ยง', b: `<ul><li>เสี่ยงต่อไม้ไม่เกิน 1–2% ของเงินในบัญชี</li><li>ทุกไม้ต้องมี SL และ TP · อัตรากำไรต่อความเสี่ยง (RR) อย่างน้อย 1.5</li><li>ห้ามถัวไม้ที่ขาดทุน และห้ามเลื่อน SL หนี</li><li>ไม่เปิดไม้ใหม่ช่วง 15–30 นาทีก่อนและหลังข่าวแรง (CPI, NFP, FOMC)</li><li>ขาดทุนติดกัน 3 ไม้ หรือพอร์ตลด 10% ให้หยุดพักวันนั้น</li><li>จดบันทึกทุกไม้ เพื่อเรียนรู้จากความผิดพลาด</li></ul>
      <div class="warn">ไม่มีระบบหรือ AI ใดรับประกันกำไรได้ การเทรดมีความเสี่ยงสูง</div>`,
      c: ['เข้าใจและจะทำตามกฎความเสี่ยง'] },
  ],
  zh: [
    { t: '打开链接并注册', b: `<ol><li>点击下方按钮打开 Exness 网站</li><li>点击注册 / 开户（按钮名称可能略有不同）</li><li>选择居住国家/地区</li><li>填写常用邮箱，并设置强密码（大小写、数字与符号）</li><li>阅读条款后确认注册</li></ol>
      <div class="tip">请使用不与其他服务重复的邮箱和密码，切勿向任何人（包括 AI 助手）透露密码。</div>${ctaHtml('zh')}`,
      c: ['已打开注册链接', '已填写邮箱、国家与密码'] },
    { t: '验证邮箱与手机', b: `<ol><li>打开 Exness 邮件并输入验证码（找不到时请检查垃圾箱/推广邮件）</li><li>可能需要手机号，请正确输入短信验证码</li><li>如有选项，建议开启两步验证</li></ol><div class="tip">验证码有效期短，过期请重新获取。</div>`,
      c: ['邮箱已验证', '手机已验证'] },
    { t: '完善资料并完成身份验证 (KYC)', b: `<ol><li>按身份证/护照准确填写个人信息（姓名、出生日期、地址）</li><li>上传身份证件：身份证或护照</li><li>可能需要自拍或人脸视频以核对证件</li><li>地址证明：如水电账单或银行对账单，姓名与地址须一致（注意文件时效）</li></ol>
      <div class="tip">快速通过提示：光线充足、无反光、四角完整、文字清晰、无修图，各处姓名拼写一致。</div><div class="tip">审核可能需数分钟至数小时，期间可继续后续部分步骤。</div>`,
      c: ['资料已填写', '已上传证件与自拍', '已上传地址证明'] },
    { t: '选择账户类型', b: `<ul><li><b>Standard Cent (USC)</b>：适合新手，余额以美分显示，可用较小资金实盘练习，单笔风险更小。</li><li><b>Standard</b>：基础美元账户，适合已理解风险管理后使用。</li><li>务必先尝试 <b>模拟账户 (Demo)</b>。</li></ul>
      <div class="tip">账户名称与条件（点差、佣金、最低入金）可能变化，请在 Exness 官网核对后再选择。</div>${ctaHtml('zh', 'login')}`,
      c: ['已试用 Demo', '已开设适合自己的真实账户'] },
    { t: '入金', b: `<ol><li>在账户中心选择入金（名称可能略有不同）</li><li>选择所在国家可用的支付方式，如银行转账、二维码等（方式与费用可能变化）</li><li>输入金额并按页面步骤操作</li><li>付款银行账户应为本人同名账户</li></ol>
      <div class="warn">请从可完全承受损失的小额开始。切勿使用借款或生活必需资金。</div>`,
      c: ['已存入可承受损失的金额'] },
    { t: '安装应用或使用网页终端', b: `<ul><li><b>手机：</b>从 App Store / Google Play 安装 Exness 交易应用（确认开发者确为 Exness）</li><li><b>电脑：</b>使用浏览器 Web Terminal 或 MetaTrader 5</li><li>用交易账户登录，并确认选对账户（Demo 或真实）</li></ul><div class="tip">警惕仿冒网站与应用，仅通过官方链接或应用商店进入。</div>`,
      c: ['已安装应用 / 打开 Web Terminal', '已登录交易账户'] },
    { t: '找到 XAUUSD 并开第一单', b: `<ol><li>搜索品种 <b>XAUUSD</b>（黄金）</li><li>查看本应用 PUREGOLD 分析：偏向、入场区、止损与止盈</li><li>使用较小手数，如 0.01–0.1（美分账户）</li><li>确认下单前<strong>必须设置 SL 与 TP</strong></li><li>再次核对全部数值后确认</li></ol>
      <div class="tip">SL = 自动止损 · TP = 自动止盈 · 不确定时请先在 Demo 练习。</div>`,
      c: ['已找到 XAUUSD', '已开出带 SL/TP 的第一单'] },
    { t: '风险管理规则', b: `<ul><li>每笔风险不超过账户的 1–2%</li><li>每笔必须有 SL 与 TP · 盈亏比 (RR) 至少 1.5</li><li>禁止摊平亏损单，禁止把止损越移越远</li><li>重大数据（CPI、NFP、FOMC）前后 15–30 分钟勿新开仓</li><li>连亏 3 笔或回撤 10% 当日停手</li><li>记录每笔交易以复盘错误</li></ul>
      <div class="warn">任何系统或 AI 都不能保证盈利。交易风险很高。</div>`,
      c: ['我理解并将遵守风险规则'] },
  ],
};

/** Map app language → signup content language (JA falls back to EN). */
export function signupLang(appLang) {
  if (appLang === 'zh') return 'zh';
  if (appLang === 'th') return 'th';
  return 'en'; // en + ja + unknown
}

export function steps(lang) {
  const L = signupLang(lang);
  return STEPS[L] || STEPS.en;
}

export const DISC = {
  th: `<b>การเปิดเผยข้อมูล:</b> ลิงก์สมัครในหน้านี้เป็นลิงก์แนะนำ (partner) ของผู้จัดทำ (รหัส s2didh6p) หากสมัครผ่านลิงก์ ผู้จัดทำอาจได้รับค่าตอบแทนจาก Exness โดยไม่มีค่าใช้จ่ายเพิ่มสำหรับคุณ<br>
<b>คำเตือนความเสี่ยง:</b> CFD และทองคำ (XAUUSD) เป็นสินค้าที่มีเลเวอเรจและความเสี่ยงสูง คุณอาจขาดทุนเงินลงทุนได้ทั้งหมดอย่างรวดเร็ว ลงทุนเฉพาะเงินที่เสียได้ ข้อมูลนี้เพื่อการศึกษา ไม่ใช่คำแนะนำการลงทุน และขั้นตอน/ชื่อปุ่มบนเว็บ Exness อาจเปลี่ยนแปลงได้`,
  en: `<b>Disclosure:</b> The sign-up link on this page is the author's partner referral link (code s2didh6p). If you register through it, the author may receive a commission from Exness at no extra cost to you.<br>
<b>Risk warning:</b> CFDs and gold (XAUUSD) are leveraged, high-risk products. You can lose all of your investment quickly. Only invest money you can afford to lose. This is for education only, not investment advice, and the steps/button names on the Exness site may change.`,
  zh: `<b>信息披露：</b>本页注册链接为作者合作推荐链接（代码 s2didh6p）。若通过该链接注册，作者可能从 Exness 获得佣金，您无需额外付费。<br>
<b>风险提示：</b>CFD 与黄金（XAUUSD）为杠杆、高风险产品，可能迅速亏完全部本金。请仅使用可承受损失的资金。内容仅供教育，非投资建议；Exness 网站步骤/按钮名称可能变更。`,
};
