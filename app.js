/* ============================================================
   Not Programming — الواجهة
   ============================================================ */
import {
  onAuthChange, getMe,
  registerUser, loginUser, logoutUser, resetPassword,
  logActivity, watchActivity, watchStudents,
  watchCourses, addCourse, deleteCourse,
  enrollCourse, watchMyEnrollments,
  uploadPaymentProof, watchPayments, updatePaymentStatus,
  addExam, deleteExam, watchExams, submitExam, watchExamResults, watchMyResults,
  getSettings, setSettings, askAI,
} from "./firebase.js";

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $("#app");

function toast(msg, type = "") {
  const t = document.createElement("div");
  t.className = "toast " + type; t.textContent = msg;
  $("#toasts").appendChild(t);
  setTimeout(() => t.remove(), 3600);
}
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = ts => { try { return ts?.toDate?.().toLocaleString("ar-EG") || ""; } catch { return ""; } };
const initials = n => (n || "؟").trim().split(/\s+/).slice(0, 2).map(x => x[0]).join("");

let unsubs = [];
const cleanSubs = () => { unsubs.forEach(u => { try { u(); } catch {} }); unsubs = []; };
const sub = u => { if (typeof u === "function") unsubs.push(u); };

let route = "home";
window.addEventListener("hashchange", () => { route = (location.hash || "#home").slice(1); render(); });

/* ================= الهيدر ================= */
function renderHeader() {
  const me = getMe();
  $("#header").classList.remove("hidden");
  const nav = $("#nav"), ua = $("#userArea");
  nav.innerHTML = ""; ua.innerHTML = "";

  const links = me.isLoggedIn
    ? [["dashboard","لوحتي"],["courses","الكورسات"],["exams","الامتحانات"],["chat","المساعد الذكي"]]
    : [["home","الرئيسية"],["login","دخول"],["register","حساب جديد"]];

  links.forEach(([r, t]) => {
    const b = document.createElement("button");
    b.textContent = t;
    if (route === r) b.classList.add("active");
    b.onclick = () => { location.hash = "#" + r; };
    nav.appendChild(b);
  });

  if (me.isLoggedIn) {
    const av = document.createElement("div"); av.className = "avatar"; av.textContent = initials(me.profile?.name);
    const nm = document.createElement("span"); nm.textContent = me.profile?.name || "مستخدم"; nm.style.fontSize = "14px";
    const out = document.createElement("button"); out.textContent = "خروج";
    out.onclick = async () => { await logoutUser(); location.hash = "#home"; };
    ua.append(av, nm, out);
  }
}

/* ================= الرئيسية ================= */
function viewHome() {
  app.innerHTML = `
    <div class="page-title">تعلّم البرمجة من الصفر 🚀</div>
    <div class="page-sub">كورسات عربية، امتحانات تفاعلية، مساعد ذكي، ومتابعة لحظية.</div>
    <div class="grid">
      <div class="card"><h3>📚 كورسات</h3><p>من الأساسيات للاحتراف.</p></div>
      <div class="card"><h3>📝 امتحانات</h3><p>اختبر نفسك والنتيجة تظهر للمعلم فوراً.</p></div>
      <div class="card"><h3>🤖 مساعد ذكي</h3><p>اسأل أي سؤال في البرمجة.</p></div>
    </div><div class="space"></div>
    <button class="btn" onclick="location.hash='#register'">ابدأ الآن مجاناً</button>`;
}

/* ================= الدخول ================= */
function viewLogin() {
  app.innerHTML = `
    <div class="form card">
      <h2 class="page-title" style="font-size:20px">تسجيل الدخول</h2>
      <div><label>البريد الإلكتروني</label><input id="email" type="email" autocomplete="email"></div>
      <div><label>كلمة المرور</label><input id="pass" type="password" autocomplete="current-password"></div>
      <button class="btn" id="loginBtn">دخول</button>
      <button class="btn ghost sm" id="forgotBtn">نسيت كلمة المرور؟</button>
      <p class="muted" style="font-size:14px;text-align:center">معندكش حساب؟ <a href="#register" style="color:var(--acc2)">سجل الآن</a></p>
    </div>`;
  $("#loginBtn").onclick = async () => {
    const em = $("#email").value, ps = $("#pass").value;
    if (!em || !ps) return toast("املا الحقول", "err");
    $("#loginBtn").disabled = true;
    try { await loginUser(em, ps); toast("أهلاً بيك 👋","ok"); location.hash = "#dashboard"; }
    catch (e) { toast("خطأ في الدخول: " + e.message, "err"); }
    finally { $("#loginBtn").disabled = false; }
  };
  $("#forgotBtn").onclick = async () => {
    const em = $("#email").value;
    if (!em) return toast("اكتب إيميلك الأول","err");
    try { await resetPassword(em); toast("بعتنالك رابط على إيميلك","ok"); } catch (e) { toast(e.message,"err"); }
  };
}

/* ================= التسجيل ================= */
function viewRegister() {
  app.innerHTML = `
    <div class="form card">
      <h2 class="page-title" style="font-size:20px">إنشاء حساب جديد</h2>
      <div><label>الاسم بالكامل</label><input id="name"></div>
      <div><label>البريد الإلكتروني</label><input id="email" type="email" autocomplete="email"></div>
      <div><label>كلمة المرور (6 حروف على الأقل)</label><input id="pass" type="password" autocomplete="new-password"></div>
      <button class="btn" id="regBtn">إنشاء الحساب</button>
      <p class="muted" style="font-size:14px;text-align:center">عندك حساب؟ <a href="#login" style="color:var(--acc2)">سجّل دخول</a></p>
    </div>`;
  $("#regBtn").onclick = async () => {
    const nm = $("#name").value.trim(), em = $("#email").value, ps = $("#pass").value;
    if (!nm || !em || ps.length < 6) return toast("تأكد من البيانات (6 حروف على الأقل)","err");
    $("#regBtn").disabled = true;
    try { await registerUser(em, ps, nm); toast("تم إنشاء الحساب ✅","ok"); location.hash = "#dashboard"; }
    catch (e) { toast(e.code === "auth/email-already-in-use" ? "الإيميل مستخدم" : e.message, "err"); }
    finally { $("#regBtn").disabled = false; }
  };
}

/* ================= الكورسات ================= */
function viewCourses() {
  app.innerHTML = `<div class="page-title">الكورسات</div><div class="page-sub">اختر كورس وابدأ.</div>
    <div id="courseList" class="grid"><div class="empty">جاري التحميل…</div></div>`;
  sub(watchCourses(list => {
    const box = $("#courseList"); if (!box) return;
    box.innerHTML = list.length ? list.map(c => `
      <div class="card">
        <h3>${esc(c.title)}</h3><p>${esc(c.description || "")}</p><div class="space"></div>
        <div class="row">
          <span class="badge">${esc(c.price || "مجاني")}</span>
          ${c.videoUrl ? `<a class="btn sm ghost" href="${esc(c.videoUrl)}" target="_blank" rel="noopener">مشاهدة</a>` : ""}
          <button class="btn sm" data-enroll="${c.id}" data-title="${esc(c.title)}">اشترك</button>
        </div>
      </div>`).join("") : `<div class="empty">لا توجد كورسات بعد.</div>`;
    $$("[data-enroll]", box).forEach(b => b.onclick = async () => {
      try { await enrollCourse(b.dataset.enroll, b.dataset.title); toast("تم الاشتراك ✅","ok"); }
      catch (e) { toast(e.message,"err"); }
    });
  }));
}

/* ================= لوحة الطالب ================= */
function viewDashboard() {
  const me = getMe();
  if (me.isTeacher) return viewTeacherDashboard();

  app.innerHTML = `
    <div class="page-title">مرحباً ${esc(me.profile?.name || "")} 👋</div>
    <div class="page-sub">لوحتك الشخصية.</div>
    <div class="grid" id="stats"></div>
    <div class="space"></div>
    <h3 style="margin-bottom:12px">كورساتي</h3>
    <div id="myCourses" class="grid"><div class="empty">جاري التحميل…</div></div>
    <div class="space"></div>
    <h3 style="margin-bottom:12px">نتائج امتحاناتي</h3>
    <div id="myResults"><div class="empty">جاري التحميل…</div></div>
    <div class="space"></div>
    <h3 style="margin-bottom:12px">رفع إشعار دفع</h3>
    <div class="card"><div class="row"><input type="file" id="proof" accept="image/*"><button class="btn sm" id="upBtn">رفع</button></div></div>`;

  sub(watchMyEnrollments(list => {
    const box = $("#myCourses"); if (!box) return;
    box.innerHTML = list.length ? list.map(e => `<div class="card"><h3>${esc(e.courseTitle)}</h3><p class="muted">اشتركت: ${fmt(e.enrolledAt)}</p></div>`).join("")
      : `<div class="empty">لسه مشتركتش في كورسات. <a href="#courses" style="color:var(--acc2)">تصفح</a></div>`;
    const s = $("#stats"); if (s) s.innerHTML = `<div class="card stat"><span class="muted">عدد كورساتك</span><b>${list.length}</b></div>`;
  }));

  sub(watchMyResults(list => {
    const box = $("#myResults"); if (!box) return;
    box.innerHTML = list.length ? list.map(r => `
      <div class="log-row">
        <div><b>${esc(r.examTitle)}</b></div>
        <span class="badge ${r.score / r.total >= 0.5 ? "ok" : "err"}">${r.score}/${r.total}</span>
      </div>`).join("") : `<div class="empty">لسه مضّيتش امتحانات. <a href="#exams" style="color:var(--acc2)">تصفح الامتحانات</a></div>`;
  }));

  $("#upBtn").onclick = async () => {
    const f = $("#proof").files[0];
    if (!f) return toast("اختر صورة أولاً","err");
    try { await uploadPaymentProof(f, "general", "دفع عام"); toast("تم الرفع ✅","ok"); }
    catch (e) { toast(e.message,"err"); }
  };
}

/* ================= ✅ الامتحانات (طالب) ================= */
function viewExams() {
  app.innerHTML = `<div class="page-title">الامتحانات 📝</div><div class="page-sub">اختبر نفسك، النتيجة تظهر للمعلم فوراً.</div>
    <div id="examList" class="grid"><div class="empty">جاري التحميل…</div></div>`;
  sub(watchExams(list => {
    const box = $("#examList"); if (!box) return;
    box.innerHTML = list.length ? list.map(e => `
      <div class="card">
        <h3>${esc(e.title)}</h3>
        <p class="muted">${e.courseTitle ? esc(e.courseTitle) + " • " : ""}${(e.questions || []).length} سؤال${e.duration ? " • " + e.duration + " دقيقة" : ""}</p>
        <div class="space"></div>
        <button class="btn" data-start="${e.id}">ابدأ الامتحان</button>
      </div>`).join("") : `<div class="empty">لا توجد امتحانات بعد.</div>`;
    $$("[data-start]", box).forEach(b => b.onclick = () => {
      const ex = list.find(x => x.id === b.dataset.start);
      startExam(ex);
    });
  }));
}

function startExam(ex) {
  const questions = ex.questions || [];
  if (!questions.length) return toast("الامتحان فاضي","err");
  const answers = new Array(questions.length).fill(-1);

  app.innerHTML = `
    <div class="page-title">${esc(ex.title)}</div>
    ${ex.duration ? `<div class="timer" id="timer">⏱️ ${ex.duration}:00</div>` : ""}
    <form id="examForm">
      ${questions.map((q, i) => `
        <div class="q-box">
          <div class="q-text">${i + 1}) ${esc(q.q)}</div>
          ${(q.options || []).map((op, j) => `
            <label class="opt" data-q="${i}" data-o="${j}">
              <input type="radio" name="q${i}" value="${j}">
              <span>${esc(op)}</span>
            </label>`).join("")}
        </div>`).join("")}
      <button class="btn" id="submitBtn" type="submit">تسليم الامتحان</button>
    </form>`;

  // تحديد الإجابة
  app.addEventListener("click", e => {
    const lab = e.target.closest(".opt"); if (!lab) return;
    const qi = +lab.dataset.q, oi = +lab.dataset.o;
    answers[qi] = oi;
    $$(`.opt[data-q="${qi}"]`, app).forEach(l => l.classList.remove("sel"));
    lab.classList.add("sel");
  });

  // المؤقّت
  let interval = null;
  if (ex.duration) {
    let left = ex.duration * 60;
    interval = setInterval(() => {
      left--;
      const el = $("#timer"); if (!el) return;
      const m = String(Math.floor(left / 60)).padStart(2, "0");
      const s = String(left % 60).padStart(2, "0");
      el.textContent = `⏱️ ${m}:${s}`;
      if (left <= 60) el.classList.add("danger");
      if (left <= 0) { clearInterval(interval); toast("انتهى الوقت!","err"); doSubmit(); }
    }, 1000);
  }

  const doSubmit = async () => {
    if (interval) clearInterval(interval);
    let score = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct) score++; });

    try {
      await submitExam({
        examId: ex.id, examTitle: ex.title,
        score, total: questions.length,
        answers, duration: ex.duration || null,
      });
      // عرض النتيجة
      app.innerHTML = `
        <div class="page-title">تم التسليم ✅</div>
        <div class="card">
          <div class="stat"><span class="muted">نتيجتك</span><b>${score} / ${questions.length}</b></div>
          <div class="space"></div>
          ${questions.map((q, i) => `
            <div class="q-box">
              <div class="q-text">${i + 1}) ${esc(q.q)}</div>
              ${(q.options || []).map((op, j) => {
                let cls = "";
                if (j === q.correct) cls = "correct";
                else if (j === answers[i]) cls = "wrong";
                return `<div class="opt ${cls}"><span>${esc(op)}</span></div>`;
              }).join("")}
            </div>`).join("")}
          <div class="space"></div>
          <button class="btn" onclick="location.hash='#dashboard'">رجوع للوحة</button>
        </div>`;
      toast("تم إرسال النتيجة للمعلم ✅","ok");
    } catch (e) { toast(e.message,"err"); }
  };

  $("#examForm").onsubmit = (e) => {
    e.preventDefault();
    if (answers.includes(-1) && !confirm("فيه أسئلة من غير إجابة، تكمل؟")) return;
    doSubmit();
  };
}

/* ================= لوحة المعلم ================= */
function viewTeacherDashboard() {
  app.innerHTML = `
    <div class="page-title">لوحة المعلم 🎓</div>
    <div class="page-sub">كل حاجة بتوصلك لحظياً.</div>
    <div class="grid" id="stats"></div>
    <div class="space"></div>
    <div class="tabs" id="tabs">
      <button data-tab="activity" class="active">النشاط اللحظي</button>
      <button data-tab="students">الطلاب</button>
      <button data-tab="courses">الكورسات</button>
      <button data-tab="exams">الامتحانات</button>
      <button data-tab="results">النتائج</button>
      <button data-tab="payments">المدفوعات</button>
      <button data-tab="settings">الإعدادات</button>
    </div>
    <div id="tabBody"></div>`;

  $("#stats").innerHTML = `
    <div class="card stat"><span class="muted">آخر حركات</span><b id="s-act">0</b></div>
    <div class="card stat"><span class="muted">طلاب</span><b id="s-stu">0</b></div>
    <div class="card stat"><span class="muted">كورسات</span><b id="s-crs">0</b></div>
    <div class="card stat"><span class="muted">امتحانات</span><b id="s-exm">0</b></div>
    <div class="card stat"><span class="muted">مدفوعات معلّقة</span><b id="s-pay">0</b></div>`;

  sub(watchActivity(rows => {
    const el = $("#s-act"); if (el) el.textContent = rows.length;
    const box = $("#activityBox");
    if (box) box.innerHTML = rows.length ? rows.map(r => `
      <div class="log-row">
        <div><b>${esc(r.name)}</b> <span class="muted">— ${esc(r.action)}</span>${r.note ? ` <span class="muted">(${esc(r.note)})</span>` : ""}</div>
        <span class="muted" style="font-size:12px">${fmt(r.time)}</span>
      </div>`).join("") : `<div class="empty">لا يوجد نشاط بعد.</div>`;
  }));
  sub(watchStudents(l => { const e = $("#s-stu"); if (e) e.textContent = l.length; }));
  sub(watchCourses(l => { const e = $("#s-crs"); if (e) e.textContent = l.length; }));
  sub(watchExams(l => { const e = $("#s-exm"); if (e) e.textContent = l.length; }));
  sub(watchPayments(l => { const e = $("#s-pay"); if (e) e.textContent = l.filter(p => p.status === "pending").length; }));

  const tabs = $("#tabs");
  tabs.onclick = e => {
    const b = e.target.closest("button[data-tab]"); if (!b) return;
    $$("button", tabs).forEach(x => x.classList.remove("active"));
    b.classList.add("active"); renderTab(b.dataset.tab);
  };
  renderTab("activity");
}

function renderTab(tab) {
  const body = $("#tabBody"); if (!body) return;

  if (tab === "activity") body.innerHTML = `<div id="activityBox"><div class="empty">جاري التحميل…</div></div>`;
  if (tab === "students") body.innerHTML = `<div id="stuBox"><div class="empty">جاري التحميل…</div></div>`;
  if (tab === "exams") { body.innerHTML = examBuilderHTML(); bindExamBuilder(); }
  if (tab === "results") body.innerHTML = `<div id="resBox"><div class="empty">جاري التحميل…</div></div>`;
  if (tab === "payments") body.innerHTML = `<div id="payBox"><div class="empty">جاري التحميل…</div></div>`;
  if (tab === "courses") {
    body.innerHTML = `
      <div class="card">
        <h3>إضافة كورس</h3><div class="space"></div>
        <div style="display:grid;gap:10px">
          <input id="c-title" placeholder="اسم الكورس">
          <textarea id="c-desc" rows="3" placeholder="وصف الكورس"></textarea>
          <input id="c-video" placeholder="رابط الفيديو">
          <input id="c-price" placeholder="السعر (مثال: 100 ج)">
          <button class="btn" id="addCourseBtn">إضافة</button>
        </div>
      </div><div class="space"></div>
      <div id="coursesBox" class="grid"><div class="empty">جاري التحميل…</div></div>`;
    $("#addCourseBtn").onclick = async () => {
      const t = $("#c-title").value.trim();
      if (!t) return toast("اكتب اسم الكورس","err");
      await addCourse({ title: t, description: $("#c-desc").value.trim(), videoUrl: $("#c-video").value.trim(), price: $("#c-price").value.trim() || "مجاني" });
      $("#c-title").value = $("#c-desc").value = $("#c-video").value = $("#c-price").value = "";
      toast("تمت الإضافة ✅","ok");
    };
    sub(watchCourses(list => {
      const box = $("#coursesBox"); if (!box) return;
      box.innerHTML = list.length ? list.map(c => `
        <div class="card"><h3>${esc(c.title)}</h3><p>${esc(c.description || "")}</p><div class="space"></div>
          <div class="row"><span class="badge">${esc(c.price || "مجاني")}</span>
          <button class="btn sm err" data-del="${c.id}">حذف</button></div></div>`).join("")
        : `<div class="empty">لا توجد كورسات.</div>`;
      $$("[data-del]", box).forEach(b => b.onclick = async () => {
        if (confirm("تأكيد الحذف؟")) { await deleteCourse(b.dataset.del); toast("تم الحذف","ok"); }
      });
    }));
  }
  if (tab === "settings") {
    body.innerHTML = `
      <div class="card">
        <h3>إعدادات المنصة</h3><div class="space"></div>
        <label>رابط خادم الذكاء الاصطناعي (Cloudflare Worker)</label>
        <input id="aiUrl" placeholder="https://xxx.workers.dev">
        <div class="space"></div>
        <button class="btn" id="saveSettings">حفظ</button>
      </div>`;
    getSettings().then(s => { const el = $("#aiUrl"); if (el) el.value = s.aiUrl || ""; });
    $("#saveSettings").onclick = async () => {
      await setSettings({ aiUrl: $("#aiUrl").value.trim() }); toast("تم الحفظ ✅","ok");
    };
  }

  if (tab === "students") sub(watchStudents(list => {
    const box = $("#stuBox"); if (!box) return;
    box.innerHTML = list.length ? list.map(u => `
      <div class="log-row">
        <div><b>${esc(u.name)}</b><div class="muted" style="font-size:12px">${esc(u.email)}</div></div>
        <span class="muted" style="font-size:12px">آخر ظهور: ${fmt(u.lastSeen)}</span>
      </div>`).join("") : `<div class="empty">لا يوجد طلاب.</div>`;
  }));

  if (tab === "results") sub(watchExamResults(list => {
    const box = $("#resBox"); if (!box) return;
    box.innerHTML = list.length ? list.map(r => `
      <div class="log-row">
        <div>
          <b>${esc(r.name)}</b> <span class="muted">— ${esc(r.examTitle)}</span>
          <div class="muted" style="font-size:12px">${esc(r.email)} • ${fmt(r.submittedAt)}</div>
        </div>
        <span class="badge ${r.score / r.total >= 0.5 ? "ok" : "err"}">${r.score}/${r.total}</span>
      </div>`).join("") : `<div class="empty">لا توجد نتائج بعد.</div>`;
  }));

  if (tab === "payments") {
    sub(watchPayments(list => {
      const box = $("#payBox"); if (!box) return;
      box.innerHTML = list.length ? list.map(p => `
        <div class="log-row">
          <div><b>${esc(p.name)}</b> <span class="muted">— ${esc(p.courseTitle || "")}</span>
            <div class="muted" style="font-size:12px">${esc(p.email)} • ${fmt(p.createdAt)}</div></div>
          <div class="row">
            <a class="btn sm ghost" href="${esc(p.proofUrl)}" target="_blank" rel="noopener">عرض</a>
            ${p.status === "pending"
              ? `<button class="btn sm ok" data-ok="${p.id}" data-t="${esc(p.courseTitle || "")}">قبول</button>
                 <button class="btn sm err" data-no="${p.id}" data-t="${esc(p.courseTitle || "")}">رفض</button>`
              : `<span class="badge ${p.status === "approved" ? "ok" : "err"}">${p.status === "approved" ? "مقبول" : "مرفوض"}</span>`}
          </div>
        </div>`).join("") : `<div class="empty">لا توجد مدفوعات.</div>`;
      $$("[data-ok]", box).forEach(b => b.onclick = async () => { await updatePaymentStatus(b.dataset.ok, "approved", null, b.dataset.t); toast("تم القبول ✅","ok"); });
      $$("[data-no]", box).forEach(b => b.onclick = async () => { await updatePaymentStatus(b.dataset.no, "rejected", null, b.dataset.t); toast("تم الرفض","ok"); });
    }));
  }
}

/* ================= ✅ منشئ الامتحانات ================= */
function examBuilderHTML() {
  return `
  <div class="card">
    <h3>إنشاء امتحان جديد</h3><div class="space"></div>
    <div style="display:grid;gap:10px">
      <input id="e-title" placeholder="اسم الامتحان (مثلاً: امتحان JS الأساسي)">
      <input id="e-course" placeholder="الكورس المرتبط (اختياري)">
      <input id="e-dur" type="number" min="1" placeholder="المدة بالدقائق (اختياري)">
    </div>
    <div class="space"></div>
    <h4>الأسئلة</h4>
    <div id="qList"></div>
    <div class="row">
      <button class="btn ghost sm" id="addQBtn" type="button">+ إضافة سؤال</button>
      <button class="btn" id="saveExamBtn" type="button">حفظ الامتحان</button>
    </div>
  </div>
  <div class="space"></div>
  <h3>الامتحانات الحالية</h3>
  <div id="examsBox" class="grid" style="margin-top:12px"><div class="empty">جاري التحميل…</div></div>`;
}

function questionHTML(i) {
  return `
  <div class="q-box" data-qidx="${i}">
    <div class="row">
      <input class="q-input" placeholder="نص السؤال ${i + 1}" style="flex:1">
      <button class="btn sm err del-q" type="button">حذف</button>
    </div>
    <div class="space"></div>
    ${[0,1,2,3].map(j => `
      <div class="row" style="margin-bottom:8px">
        <label style="display:flex;align-items:center;gap:8px;min-width:70px">
          <input type="radio" name="correct-${i}" value="${j}"> صحيح
        </label>
        <input class="q-opt" data-idx="${j}" placeholder="الاختيار ${j + 1}" style="flex:1">
      </div>`).join("")}
  </div>`;
}

function bindExamBuilder() {
  let counter = 0;
  const addQ = () => { $("#qList").insertAdjacentHTML("beforeend", questionHTML(counter)); counter++; };
  addQ(); addQ(); // سؤالين افتراضياً

  $("#addQBtn").onclick = addQ;

  $("#qList").addEventListener("click", e => {
    if (e.target.classList.contains("del-q")) {
      e.target.closest(".q-box").remove();
    }
  });

  $("#saveExamBtn").onclick = async () => {
    const title = $("#e-title").value.trim();
    if (!title) return toast("اكتب اسم الامتحان","err");

    const boxes = $$("#qList .q-box");
    const questions = [];
    for (const box of boxes) {
      const qText = $(".q-input", box).value.trim();
      if (!qText) continue;
      const options = $$(".q-opt", box).map(i => i.value.trim()).filter(Boolean);
      const correctRadio = $('input[type="radio"]:checked', box);
      if (options.length < 2) return toast("كل سؤال لازم اختيارين على الأقل","err");
      if (!correctRadio) return toast("حدد الإجابة الصحيحة لكل سؤال","err");
      const correct = +correctRadio.value;
      if (correct >= options.length) return toast("حدد إجابة صحيحة ضمن الاختيارات الموجودة","err");
      questions.push({ q: qText, options, correct });
    }

    if (!questions.length) return toast("أضف سؤال واحد على الأقل","err");

    await addExam({
      title,
      courseTitle: $("#e-course").value.trim(),
      duration: Number($("#e-dur").value) || null,
      questions,
    });
    toast("تم حفظ الامتحان ✅","ok");
    renderTab("exams");
  };

  sub(watchExams(list => {
    const box = $("#examsBox"); if (!box) return;
    box.innerHTML = list.length ? list.map(x => `
      <div class="card">
        <h3>${esc(x.title)}</h3>
        <p class="muted">${(x.questions || []).length} سؤال${x.duration ? " • " + x.duration + " دقيقة" : ""}</p>
        <div class="space"></div>
        <button class="btn sm err" data-del="${x.id}">حذف</button>
      </div>`).join("") : `<div class="empty">لا توجد امتحانات.</div>`;
    $$("[data-del]", box).forEach(b => b.onclick = async () => {
      if (confirm("تأكيد حذف الامتحان؟")) { await deleteExam(b.dataset.del); toast("تم الحذف","ok"); }
    });
  }));
}

/* ================= المساعد الذكي ================= */
function viewChat() {
  app.innerHTML = `
    <div class="page-title">المساعد الذكي 🤖</div>
    <div class="page-sub">اسأل أي سؤال في البرمجة.</div>
    <div class="chat">
      <div class="chat-body" id="chatBody"><div class="msg ai">أهلاً! اسألني أي حاجة في البرمجة 💡</div></div>
      <div class="chat-input"><input id="chatIn" placeholder="اكتب سؤالك…"><button class="btn" id="sendBtn">إرسال</button></div>
    </div>`;
  const history = [];
  const body = $("#chatBody");
  const send = async () => {
    const t = $("#chatIn").value.trim(); if (!t) return;
    $("#chatIn").value = ""; history.push({ role: "user", content: t });
    body.insertAdjacentHTML("beforeend", `<div class="msg me">${esc(t)}</div>`);
    body.scrollTop = body.scrollHeight;
    const th = document.createElement("div"); th.className = "msg ai"; th.textContent = "…يفكر";
    body.appendChild(th); body.scrollTop = body.scrollHeight;
    try {
      const r = await askAI(history, "أنت مساعد برمجة ودود، اشرح بالعربي وبساطة.");
      th.textContent = r; history.push({ role: "assistant", content: r });
    } catch (e) { th.textContent = "⚠️ " + e.message; }
    body.scrollTop = body.scrollHeight;
    logActivity("ai_chat", null, "استخدم المساعد الذكي");
  };
  $("#sendBtn").onclick = send;
  $("#chatIn").addEventListener("keydown", e => { if (e.key === "Enter") send(); });
}

/* ================= الراوتر ================= */
function render() {
  cleanSubs();
  const me = getMe();
  if (!me.isLoggedIn && ["dashboard","chat","exams"].includes(route)) route = "login";
  renderHeader();
  switch (route) {
    case "login":     return viewLogin();
    case "register":  return viewRegister();
    case "courses":   return viewCourses();
    case "exams":     return viewExams();
    case "dashboard": return me.isTeacher ? viewTeacherDashboard() : viewDashboard();
    case "chat":      return viewChat();
    default:          return me.isLoggedIn ? viewDashboard() : viewHome();
  }
}

/* ================= التشغيل ================= */
$("#brandBtn").onclick = () => { location.hash = getMe().isLoggedIn ? "#dashboard" : "#home"; };
let booted = false;
onAuthChange(() => {
  $("#splash").classList.add("hidden");
  if (!booted) { booted = true; route = location.hash.slice(1) || "home"; }
  render();
});
