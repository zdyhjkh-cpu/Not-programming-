/* ============================================================
   Not Programming — Firebase Core
   ============================================================ */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, setPersistence, browserLocalPersistence,
  sendPasswordResetEmail, updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc,
  collection, addDoc, onSnapshot, query, where, orderBy, limit,
  serverTimestamp, getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

/* ===== إعدادات مشروعك ===== */
const firebaseConfig = {
  apiKey: "AIzaSyA5VfLrwSq8zEcz5BNVTeFzk7stMDNFpVA",
  authDomain: "notprogramming-727ac.firebaseapp.com",
  projectId: "notprogramming-727ac",
  storageBucket: "notprogramming-727ac.firebasestorage.app",
  messagingSenderId: "507929901929",
  appId: "1:507929901929:web:43239a2e4aa8548a201bf8",
};

/* ===== إيميل المعلم الجديد ===== */
export const TEACHER_EMAILS = ["ghhbvvbnt@gmail.com"];

export const isTeacherEmail = (email) =>
  TEACHER_EMAILS.map(e => e.toLowerCase()).includes((email || "").toLowerCase());

/* ===== التهيئة ===== */
const app     = initializeApp(firebaseConfig);
const auth    = getAuth(app);
const db      = getFirestore(app);
const storage = getStorage(app);

setPersistence(auth, browserLocalPersistence).catch(console.error);

/* ===== حالة المستخدم ===== */
let currentUser = null;
let currentProfile = null;

const listeners = new Set();
export function onAuthChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function broadcast() { listeners.forEach(fn => { try { fn(currentUser, currentProfile); } catch (e) { console.error(e); } }); }

onAuthStateChanged(auth, async (user) => {
  currentUser = user || null;
  if (user) {
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      currentProfile = snap.exists() ? snap.data() : { name: user.displayName || "مستخدم", role: "student" };
    } catch { currentProfile = { name: user.displayName || "مستخدم", role: "student" }; }
  } else { currentProfile = null; }
  broadcast();
});

export const getMe = () => ({
  user: currentUser,
  profile: currentProfile,
  isTeacher: currentProfile?.role === "teacher",
  isLoggedIn: !!currentUser,
});

/* ============================================================
   1) الحساب
   ============================================================ */
export async function registerUser(email, password, name) {
  const e = email.trim().toLowerCase();
  const cred = await createUserWithEmailAndPassword(auth, e, password);
  await updateProfile(cred.user, { displayName: name });
  const role = isTeacherEmail(e) ? "teacher" : "student";
  await setDoc(doc(db, "users", cred.user.uid), {
    name, email: e, role, createdAt: serverTimestamp(), lastSeen: serverTimestamp(),
  });
  await logActivity("register", null, "أنشأ حساب جديد");
  return cred.user;
}

export async function loginUser(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
  await updateDoc(doc(db, "users", cred.user.uid), { lastSeen: serverTimestamp() }).catch(() => {});
  await logActivity("login", null, "دخل الموقع");
  return cred.user;
}

export async function logoutUser() {
  if (currentUser) await logActivity("logout", null, "خرج من الموقع").catch(() => {});
  return signOut(auth);
}
export const resetPassword = (email) => sendPasswordResetEmail(auth, email.trim().toLowerCase());

/* ============================================================
   2) الأنشطة اللحظية
   ============================================================ */
export async function logActivity(action, courseId = null, note = "") {
  const u = auth.currentUser;
  if (!u) return;
  try {
    await addDoc(collection(db, "activity"), {
      uid: u.uid, name: currentProfile?.name || u.displayName || "طالب",
      email: u.email, role: currentProfile?.role || "student",
      action, courseId, note, time: serverTimestamp(),
    });
  } catch (e) { console.warn("logActivity:", e.message); }
}

export function watchActivity(cb, max = 150) {
  const q = query(collection(db, "activity"), orderBy("time", "desc"), limit(max));
  return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => { console.error(e); cb([]); });
}
export function watchStudents(cb) {
  const q = query(collection(db, "users"), where("role", "==", "student"));
  return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => { console.error(e); cb([]); });
}

/* ============================================================
   3) الكورسات
   ============================================================ */
export function watchCourses(cb) {
  const q = query(collection(db, "courses"), orderBy("createdAt", "desc"));
  return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => { console.error(e); cb([]); });
}
export async function addCourse(data) {
  return addDoc(collection(db, "courses"), { ...data, createdAt: serverTimestamp() });
}
export const deleteCourse = (id) => deleteDoc(doc(db, "courses", id));

/* ============================================================
   4) الاشتراك
   ============================================================ */
export async function enrollCourse(courseId, courseTitle) {
  const u = auth.currentUser;
  if (!u) throw new Error("سجّل دخول الأول");
  await setDoc(doc(db, "enrollments", `${u.uid}_${courseId}`), {
    uid: u.uid, courseId, courseTitle,
    name: currentProfile?.name, email: u.email, enrolledAt: serverTimestamp(),
  });
  await logActivity("enroll", courseId, `اشترك في: ${courseTitle}`);
}
export function watchMyEnrollments(cb) {
  const u = auth.currentUser; if (!u) return () => {};
  const q = query(collection(db, "enrollments"), where("uid", "==", u.uid));
  return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
}

/* ============================================================
   5) المدفوعات
   ============================================================ */
export async function uploadPaymentProof(file, courseId, courseTitle) {
  const u = auth.currentUser; if (!u) throw new Error("سجّل دخول الأول");
  if (file.size > 5 * 1024 * 1024) throw new Error("حجم الصورة أكبر من 5 ميجا");
  const path = `payments/${u.uid}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await addDoc(collection(db, "payments"), {
    uid: u.uid, name: currentProfile?.name || u.displayName, email: u.email,
    courseId, courseTitle, proofUrl: url, status: "pending", createdAt: serverTimestamp(),
  });
  await logActivity("payment_upload", courseId, `رفع إشعار دفع: ${courseTitle}`);
  return url;
}
export function watchPayments(cb) {
  const q = query(collection(db, "payments"), orderBy("createdAt", "desc"));
  return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => { console.error(e); cb([]); });
}
export async function updatePaymentStatus(id, status, _uid, courseTitle) {
  await updateDoc(doc(db, "payments", id), { status, reviewedAt: serverTimestamp() });
  await logActivity("payment_" + status, null, `${status === "approved" ? "قبول" : "رفض"} دفع: ${courseTitle}`);
}

/* ============================================================
   6) ✅ الامتحانات (جديد)
   ============================================================ */
export async function addExam(data) {
  // data = { title, courseId, courseTitle, duration, questions:[{q,options,correct}] }
  return addDoc(collection(db, "exams"), { ...data, createdAt: serverTimestamp() });
}
export const deleteExam = (id) => deleteDoc(doc(db, "exams", id));

export function watchExams(cb) {
  const q = query(collection(db, "exams"), orderBy("createdAt", "desc"));
  return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => { console.error(e); cb([]); });
}

export async function submitExam(result) {
  // result = { examId, examTitle, score, total, answers:[...], duration }
  const u = auth.currentUser; if (!u) throw new Error("سجّل دخول الأول");
  await addDoc(collection(db, "examResults"), {
    ...result, uid: u.uid, name: currentProfile?.name || u.displayName,
    email: u.email, submittedAt: serverTimestamp(),
  });
  await logActivity("exam_submit", result.examId,
    `سلّم امتحان "${result.examTitle}" — ${result.score}/${result.total}`);
}

export function watchExamResults(cb) {
  const q = query(collection(db, "examResults"), orderBy("submittedAt", "desc"));
  return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => { console.error(e); cb([]); });
}
export function watchMyResults(cb) {
  const u = auth.currentUser; if (!u) return () => {};
  const q = query(collection(db, "examResults"), where("uid", "==", u.uid), orderBy("submittedAt", "desc"));
  return onSnapshot(q, s => cb(s.docs.map(d => ({ id: d.id, ...d.data() }))), e => console.error(e));
}

/* ============================================================
   7) الإعدادات + الذكاء الاصطناعي
   ============================================================ */
export async function getSettings() {
  const snap = await getDoc(doc(db, "config", "settings"));
  return snap.exists() ? snap.data() : {};
}
export const setSettings = (data) => setDoc(doc(db, "config", "settings"), data, { merge: true });

export async function askAI(messages, system = "") {
  const cfg = await getSettings();
  if (!cfg.aiUrl) throw new Error("المعلم لسه مضبطش رابط خادم الذكاء الاصطناعي");
  const r = await fetch(cfg.aiUrl, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ system, messages }),
  });
  if (!r.ok) throw new Error("فشل الاتصال بخادم الذكاء الاصطناعي");
  const data = await r.json();
  return data?.content?.[0]?.text || data?.reply || "لا يوجد رد";
}

export { app, auth, db, storage };
