import React, { useState, useEffect, useMemo, useCallback } from "react";
const LOGO_SRC = "/Logo_AFTERGLOW1-05.png";
const C = {
  bg: "#1a1a1a", surface: "#232323", elevated: "#2c2c2c", border: "#3a3a3a",
  orange: "#e8732a", gold: "#d4a853", cream: "#f5f0e8", creamSoft: "#b8b0a0",
  green: "#4caf50", blue: "#5b9bd5", red: "#e05555", purple: "#9c6ade",
  text: "#f5f0e8", muted: "#888",
};

const SPACES = [
  { id: "wakeup", name: "Wake-up Discipline", icon: "▨", color: C.gold, folders: ["Morning Routine", "Reading", "Planning"], description: "Control your morning. Win the day." },
  { id: "mopas", name: "MOPAS Operations", icon: "▨", color: C.blue, folders: ["Tenders Working On", "Normal MOPAS Tasks", "Follow-up", "Company Tasks", "Tender Search Log"], description: "Separate active tenders from normal operations." },
  { id: "health", name: "Health & Fitness", icon: "▨", color: C.green, folders: ["Morning Workout", "Evening Run", "Recovery"], description: "Energy, confidence, mental strength." },
  { id: "drawing", name: "Drawing / Creative", icon: "▨", color: C.purple, folders: ["DrawingBox Study", "43 Project", "Hybrid Style"], description: "Build the skill for your creative future." },
  { id: "afterglow", name: "AFTERGLOW Brand", icon: "▨", color: C.orange, folders: ["Brand System", "Social Media", "Portfolio"], description: "Your creative identity." },
  { id: "money", name: "Money & Savings", icon: "▨", color: C.gold, folders: ["Budget", "Investments", "Career Tools"], description: "Build freedom, not just survival." },
];

const STATUSES = ["To Do", "In Progress", "Done", "Blocked"];
const PRIORITIES = ["Urgent", "High", "Normal", "Low"];
const priorityColor = (p) => p === "Urgent" ? C.red : p === "High" ? C.orange : p === "Normal" ? C.blue : C.muted;
const statusColor = (s) => s === "Done" ? C.green : s === "In Progress" ? C.orange : s === "Blocked" ? C.red : C.muted;

const COMMAND_CENTER_SECTIONS = [
  { key:"coach", label:"Mental Coach", group:"Focus" },
  { key:"stats", label:"Dashboard Stats", group:"Focus" },
  { key:"miniCalendar", label:"Calendar / Month View", group:"Focus" },
  { key:"taskCategories", label:"Task Categories", group:"Tasks" },
  { key:"todayFocus", label:"Today Focus", group:"Tasks" },
  { key:"lateTasks", label:"Late Tasks", group:"Tasks" },
  { key:"dailyRoutine", label:"Daily Routine", group:"Routine" },
  { key:"endDayReview", label:"End Day Review", group:"Routine" },
  { key:"tomorrowPrep", label:"Tomorrow Prep", group:"Routine" },
  { key:"lifeOS", label:"Life OS", group:"Growth" },
  { key:"goalProgress", label:"Goal Progress", group:"Growth" },
  { key:"mopasAlerts", label:"MOPAS Alerts", group:"MOPAS" },
  { key:"documentAlerts", label:"Document Alerts", group:"MOPAS" },
  { key:"weeklyProgress", label:"Weekly Progress", group:"Review" },
  { key:"spaceHealth", label:"Space Health", group:"Review" },
];
const DEFAULT_COMMAND_CENTER_VISIBILITY = COMMAND_CENTER_SECTIONS.reduce((acc, item) => ({ ...acc, [item.key]:true }), {});
const DEFAULT_COMMAND_CENTER_ORDER = COMMAND_CENTER_SECTIONS.map(item => item.key);

const STORE_KEY = "afterglow_tasks_v3";
const load = () => { try { const d = window.localStorage.getItem(STORE_KEY); return d ? JSON.parse(d) : []; } catch { return []; } };
const save = (t) => { try { window.localStorage.setItem(STORE_KEY, JSON.stringify(t)); } catch {} };


const API_BASE_URL = ((typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) || "http://localhost:5000").replace(/\/$/, "");
const AUTH_TOKEN_KEY = "afterglow_auth_token_v1";
const AUTH_USER_KEY = "afterglow_auth_user_v1";
const isMongoId = (value) => /^[a-f\d]{24}$/i.test(String(value || ""));
const getStoredAuthToken = () => {
  try { return window.localStorage.getItem(AUTH_TOKEN_KEY) || ""; } catch { return ""; }
};
const setStoredAuth = (token, user) => {
  try {
    if (token) window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    else window.localStorage.removeItem(AUTH_TOKEN_KEY);
    if (user) window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    else window.localStorage.removeItem(AUTH_USER_KEY);
  } catch {}
};
const getStoredAuthUser = () => readStore(AUTH_USER_KEY, null);
const getTaskCloudId = (task = {}) => task.cloudId || task._id || (isMongoId(task.id) ? task.id : "");
const normalizeChecklistForApi = (items = []) => (Array.isArray(items) ? items : []).map(item => {
  if (item && typeof item === "object") return { text:String(item.text || ""), done:item.done === true };
  return { text:String(item || ""), done:false };
}).filter(item => item.text.trim());
const normalizeCommentsForApi = (items = []) => (Array.isArray(items) ? items : []).map(item => {
  if (item && typeof item === "object") return { text:String(item.text || ""), time:item.time || new Date().toISOString() };
  return { text:String(item || ""), time:new Date().toISOString() };
}).filter(item => item.text.trim());
const taskPayloadForApi = (task = {}) => ({
  clientId: task.clientId || (!isMongoId(task.id) ? task.id : ""),
  title: task.title || "Untitled task",
  space: task.space || "wakeup",
  folder: task.folder || "",
  list: task.list || "",
  status: STATUSES.includes(task.status) ? task.status : "To Do",
  priority: PRIORITIES.includes(task.priority) ? task.priority : "Normal",
  due: task.due || "",
  time: task.time || "",
  goal: task.goal || "",
  details: task.details || "",
  checklist: normalizeChecklistForApi(task.checklist),
  comments: normalizeCommentsForApi(task.comments),
  locked: task.locked === true,
  completedAt: task.completedAt || undefined,
  isRoutine: task.isRoutine === true,
  routineKey: task.routineKey || "",
  routineDate: task.routineDate || "",
  repeat: task.repeat || "none",
  repeatDay: task.repeatDay || "",
  mopasTaskType: task.mopasTaskType || "",
  tenderStage: task.tenderStage || "",
  requestedDocuments: task.requestedDocuments || "",
  missingDocuments: task.missingDocuments || "",
  moneyCategory: task.moneyCategory || "",
  amount: Number(task.amount || 0),
});
const taskFromApi = (item = {}) => normalizeTask({
  ...item,
  id: item.clientId || item._id || item.id || `CLOUD-${Date.now()}`,
  cloudId: item._id || item.id || item.cloudId || "",
  clientId: item.clientId || "",
  completedAt: item.completedAt ? String(item.completedAt) : "",
  checklist: normalizeChecklistForApi(item.checklist),
  comments: normalizeCommentsForApi(item.comments),
});
async function afterglowApiRequest(path, options = {}) {
  const token = getStoredAuthToken();
  const headers = { "Content-Type":"application/json", ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.success === false) {
    if (response.status === 401) setStoredAuth("", null);
    const error = new Error(data.message || `API request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}
const mergeCloudTasks = (localTasks = [], cloudTasks = []) => {
  const byKey = new Map();
  const put = (task) => {
    const normalized = normalizeTask(task);
    const key = getTaskCloudId(normalized) || normalized.clientId || normalized.id;
    if (key) byKey.set(String(key), normalized);
  };
  (Array.isArray(localTasks) ? localTasks : []).forEach(put);
  (Array.isArray(cloudTasks) ? cloudTasks : []).forEach(task => {
    const normalized = normalizeTask(task);
    [getTaskCloudId(normalized), normalized.clientId, normalized.id].filter(Boolean).forEach(key => byKey.delete(String(key)));
    put(normalized);
  });
  return sortTasksSmart([...byKey.values()]);
};

const Goals_TEXT_KEY = "afterglow_Goals_text_v1";
const DOCUMENTS_KEY = "afterglow_documents_v1";
const DAILY_REPORT_KEY = "afterglow_mopas_daily_reports_v1";
const TENDER_ROOT = "D:\\PROJECT\\TENDER PREP";

const END_DAY_REVIEW_KEY = "afterglow_end_day_reviews_v1";
const STRUCTURED_GOALS_KEY = "afterglow_structured_goals_v1";
const APP_BACKUP_VERSION = "2026.05.28-life-os-final-upgrade";
const TENDER_STAGES = ["New", "Reviewing", "Preparing", "Submitted", "Awarded", "Lost"];
const MOPAS_TASK_TYPES = ["Tender Working On", "Normal Task"];
const TENDER_WORKING_FOLDER = "Tenders Working On";
const NORMAL_MOPAS_FOLDER = "Normal MOPAS Tasks";
const TENDER_SEARCH_FOLDER = "Tender Search Log";
const APP_SETTINGS_KEY = "afterglow_app_settings_v1";
const DEFAULT_DRIVE_FOLDER_ID = "1JPQ7q21cti5nCdFOWzpZLtyYkQR-p8F4";
const MONEY_ENTRIES_KEY = "afterglow_money_entries_v1";
const PURCHASE_GOALS_KEY = "afterglow_purchase_goals_v1";
const FUTURE_GOALS_KEY = "afterglow_future_goals_v1";
const ITSINDA_WEEKLY_AMOUNT = 20000;
const TASK_CATEGORY_COLLAPSE_KEY = "afterglow_task_category_collapse_v1";
const DEFAULT_APP_SETTINGS = {
  general:{ userName:"ISHIMWE Samuel", roleTitle:"Operations Manager / 3D Animator", companyName:"MOPAS Ltd", workspaceName:"AFTERGLOW / MOPAS Workspace", defaultSpace:"wakeup", timezone:"Africa/Kigali", logoSize:"medium" },
  routine:{ wakeupTime:"06:00", readingTarget:"20 pages", workoutTime:"06:50", eveningWorkoutTime:"18:30", drawingboxTime:"20:00", personalProjectTime:"21:00", afterglowBrandTime:"22:00", endDayReviewTime:"22:45", sleepTarget:"23:00", autoRoutineTasks:true },
  tasks:{ defaultPriority:"Normal", autoMoveUnfinished:"ask first", completedVisibility:"show", overdueBehavior:"move late down", weekStartDay:"Sunday", defaultReminderDays:1, showCompletedInFocus:false, doneDefaultMigrated:true },
  commandCenter:{
    visibleCount:8,
    sectionOrder:DEFAULT_COMMAND_CENTER_ORDER,
    sections:DEFAULT_COMMAND_CENTER_VISIBILITY,
    layout:"balanced",
    density:"comfortable",
    showSectionNumbers:true,
    showStatusBar:true,
    defaultExpanded:false,
    professionalCalendarPinned:false,
  },
  mopas:{ tenderRootPath:TENDER_ROOT, defaultTenderStages:TENDER_STAGES.join(", "), defaultRequiredDocuments:"RDB certificate, RRA tax clearance, RSSB clearance, VAT certificate, beneficial ownership declaration, bid security / declaration of commitment", tenderDeadlineWarningDays:7, highValueTenderThreshold:10000000, tenderUrgencyOnDashboard:true },
  documents:{ categories:"Company, Tender, Staff, Contract, Finance", expiryWarningDays:30, showExpiredOnDashboard:true, autoHighlightExpired:true, defaultOwner:"MOPAS", googleDriveFolderId:DEFAULT_DRIVE_FOLDER_ID, googleAppsScriptUploadUrl:"" },
  backup:{ autoBackupReminder:"weekly" },
  appearance:{ theme:"dark", accentColor:"orange", compactMode:false, cardDensity:"comfortable", sidebarBehavior:"auto", logoSize:"medium", fontSize:"normal", borderRadius:"rounded", panelSpacing:"normal", dashboardIcon:"▨", dashboardLabel:"Command Center", workspaceCard:true, showTaskCounts:true },
  notifications:{ browserNotifications:false, emailNotifications:true, todayDisciplineEmail:true, todayDisciplineEmailTime:"05:45", emailMode:"Current action only", emailTone:"Direct", actionWindowMinutes:60, maxEmailTasks:1, includeTaskStartTimes:true, includeWhyInEmail:true, includeNextBlock:true, includeLateWarningInCurrentEmail:true, includeDocumentAlertInCurrentEmail:false, includeRoutineProgressInCurrentEmail:true, dailyMorningPlanEmail:true, overdueEmail:true, documentExpiryEmail:true, endDayReviewEmail:true, dailyRoutineReminder:true, deadlineReminder:true, tenderDeadlineReminder:true, whatsappNumber:"+250784623361", emailAddress:"ishimwesamuel3d@gmail.com", method:"Email", googleAppsScriptEmailUrl:"" },
};
const mergeAppSettings = (value = {}) => {
  const rawCommandCenter = value.commandCenter || {};
  const validKeys = new Set(DEFAULT_COMMAND_CENTER_ORDER);
  const storedOrder = Array.isArray(rawCommandCenter.sectionOrder) ? rawCommandCenter.sectionOrder.filter(k => validKeys.has(k)) : [];
  let sectionOrder = [...storedOrder, ...DEFAULT_COMMAND_CENTER_ORDER.filter(k => !storedOrder.includes(k))];
  const needsCalendarMigration = rawCommandCenter.professionalCalendarPinned !== true;
  if (needsCalendarMigration) {
    const pinned = ["coach", "stats", "miniCalendar"];
    sectionOrder = [...pinned, ...sectionOrder.filter(k => !pinned.includes(k))];
  }
  const commandSections = { ...DEFAULT_COMMAND_CENTER_VISIBILITY, ...(rawCommandCenter.sections || {}) };
  if (needsCalendarMigration) commandSections.miniCalendar = true;
  return {
    ...DEFAULT_APP_SETTINGS,
    ...value,
    general:{ ...DEFAULT_APP_SETTINGS.general, ...(value.general || {}) },
    routine:{ ...DEFAULT_APP_SETTINGS.routine, ...(value.routine || {}) },
    tasks:{ ...DEFAULT_APP_SETTINGS.tasks, ...(value.tasks || {}), completedVisibility:"show" },
    commandCenter:{
      ...DEFAULT_APP_SETTINGS.commandCenter,
      ...rawCommandCenter,
      visibleCount: Math.max(1, Number(rawCommandCenter.visibleCount || DEFAULT_APP_SETTINGS.commandCenter.visibleCount || 8)),
      layout: ["compact", "balanced", "wide"].includes(rawCommandCenter.layout) ? rawCommandCenter.layout : DEFAULT_APP_SETTINGS.commandCenter.layout,
      density: ["compact", "comfortable"].includes(rawCommandCenter.density) ? rawCommandCenter.density : DEFAULT_APP_SETTINGS.commandCenter.density,
      showSectionNumbers: rawCommandCenter.showSectionNumbers !== false,
      showStatusBar: rawCommandCenter.showStatusBar !== false,
      defaultExpanded: rawCommandCenter.defaultExpanded === true,
      professionalCalendarPinned:true,
      sectionOrder,
      sections:commandSections,
    },
    mopas:{ ...DEFAULT_APP_SETTINGS.mopas, ...(value.mopas || {}) },
    documents:{ ...DEFAULT_APP_SETTINGS.documents, ...(value.documents || {}) },
    backup:{ ...DEFAULT_APP_SETTINGS.backup, ...(value.backup || {}) },
    appearance:{ ...DEFAULT_APP_SETTINGS.appearance, ...(value.appearance || {}) },
    notifications:{ ...DEFAULT_APP_SETTINGS.notifications, ...(value.notifications || {}) },
  };
};
const loadAppSettings = () => mergeAppSettings(readStore(APP_SETTINGS_KEY, DEFAULT_APP_SETTINGS));
const saveAppSettings = (settings) => writeStore(APP_SETTINGS_KEY, mergeAppSettings(settings));

const pad2 = (value) => String(value).padStart(2, "0");
const dateKey = (date) => {
  const d = date instanceof Date ? date : new Date(date);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const localTodayISO = () => dateKey(new Date());
const isDateKey = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));
const parseDateKey = (value) => {
  if (!isDateKey(value)) return null;
  const [y, m, d] = String(value).split("-").map(Number);
  return new Date(y, m - 1, d);
};
const addDaysISO = (value, amount) => {
  const base = parseDateKey(value) || new Date();
  const next = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  next.setDate(next.getDate() + amount);
  return dateKey(next);
};
const isTaskDone = (task) => task && task.status === "Done";
const isTaskOpen = (task) => task && task.status !== "Done";

const DAILY_ROUTINES = [
  {
    routineKey:"wake-up",
    space:"wakeup",
    title:"Wake up 6:00 AM",
    folder:"Morning Routine",
    list:"Daily Routine",
    status:"To Do",
    priority:"Urgent",
    time:"06:00",
    goal:"Start the day with discipline and control.",
    details:"Wake up at 6:00 AM, drink water, make the bed, and avoid the phone for the first 30 minutes.",
    checklist:["Wake up at 6:00 AM","Drink water","Make bed","No phone first 30 minutes"],
  },
  {
    routineKey:"read-20-pages",
    space:"wakeup",
    title:"Read 20 pages",
    folder:"Reading",
    list:"Daily Routine",
    status:"To Do",
    priority:"High",
    time:"06:10",
    goal:"Build knowledge every morning.",
    details:"Read with focus and write one useful idea that can help your work, discipline, or creative growth.",
    checklist:["Read 20 pages","Write one idea","Write one sentence to remember","Choose one action"],
  },
  {
    routineKey:"morning-workout",
    space:"health",
    title:"Morning workout / mobility",
    folder:"Morning Workout",
    list:"Daily Routine",
    status:"To Do",
    priority:"High",
    time:"06:50",
    goal:"Build strength, energy, and confidence before work.",
    details:"Simple daily body activation: push-ups, mobility, stretching, core, and breathing.",
    checklist:["Push-ups","Mobility","Stretching","Core / plank","Drink water"],
  },
  {
    routineKey:"plan-top-3",
    space:"wakeup",
    title:"Plan the day and choose top 3 tasks",
    folder:"Planning",
    list:"Daily Routine",
    status:"To Do",
    priority:"High",
    time:"08:15",
    goal:"Choose the three most important moves before the workday takes control.",
    details:"Review overdue work, MOPAS priorities, personal discipline, and choose today’s top 3 tasks.",
    checklist:["Review overdue tasks","Choose top 3 priorities","Open first task","Remove distractions"],
  },
  {
    routineKey:"search-mopas-tenders",
    space:"mopas",
    title:"Search and log new tenders",
    folder:TENDER_SEARCH_FOLDER,
    list:"Normal MOPAS Tasks",
    status:"To Do",
    priority:"High",
    time:"12:00",
    goal:"Find and record new opportunities for MOPAS before competitors move faster.",
    details:"This is a normal MOPAS task, not a tender being prepared. Check Umucyo, email, procurement portals, institution websites, and record any new opportunities.",
    checklist:["Check Umucyo","Check tender emails","Check institution websites","Record opportunities","Flag urgent deadlines"],
    mopasTaskType:"Normal Task",
  },
  {
    routineKey:"evening-health-training",
    space:"health",
    title:"Evening health training",
    folder:"Evening Run",
    list:"Daily Routine",
    status:"To Do",
    priority:"High",
    time:"18:30",
    goal:"Reset the mind after work and build long-term energy.",
    details:"Follow the weekly health plan: run, strength, walk, recovery, or stretching depending on the day.",
    checklist:["Change into workout clothes immediately","Warm up","Complete run / strength / recovery","Stretch after","Drink water"],
  },
  {
    routineKey:"drawingbox-study",
    space:"drawing",
    title:"DrawingBox study",
    folder:"DrawingBox Study",
    list:"Daily Routine",
    status:"To Do",
    priority:"High",
    time:"20:00",
    goal:"Improve drawing foundation for stronger animation and visual storytelling.",
    details:"Study lines, shapes, perspective, anatomy, character pose, or environment design.",
    checklist:["Warm-up lines","Study lesson","Practice sketch","Save today output"],
  },
  {
    routineKey:"43-project-creative-study",
    space:"drawing",
    title:"43 Project / creative study",
    folder:"43 Project",
    list:"Daily Routine",
    status:"To Do",
    priority:"High",
    time:"21:00",
    goal:"Move the 43 Project and Felicite creative direction forward every day.",
    details:"Study story, visual style, Rwandan culture, reference, character design, environment, or storyboard ideas.",
    checklist:["Research one idea","Save one reference","Write one story note","Connect it to 43 Project"],
  },
  {
    routineKey:"afterglow-brand-work",
    space:"afterglow",
    title:"AFTERGLOW brand work",
    folder:"Brand System",
    list:"Daily Routine",
    status:"To Do",
    priority:"High",
    time:"22:00",
    goal:"Build AFTERGLOW as a serious creative brand through daily progress.",
    details:"Work on brand identity, portfolio, social content, motion tests, logo system, or storytelling direction.",
    checklist:["Improve one brand asset","Plan one content idea","Save one portfolio note","Review next step"],
  },
  {
    routineKey:"end-day-review",
    space:"wakeup",
    title:"End Day Review",
    folder:"Planning",
    list:"Daily Routine",
    status:"To Do",
    priority:"High",
    time:"22:45",
    goal:"Close the day, protect the history, and prepare tomorrow.",
    details:"Review completed tasks, unfinished tasks, money decisions, MOPAS follow-up, and tomorrow top 3.",
    checklist:["Open End Day Review","Save review notes","Move normal unfinished tasks","Generate tomorrow routines"],
  },
  {
    routineKey:"check-wallet-balance",
    space:"money",
    title:"Check wallet balance",
    folder:"Budget",
    list:"Daily Money",
    status:"To Do",
    priority:"High",
    time:"07:45",
    goal:"Know how much cash and mobile money you have before spending starts.",
    details:"Check wallet, MoMo, bank balance, and note any expected income or payment.",
    checklist:["Check wallet cash","Check MoMo balance","Check bank balance","Write expected income today"],
  },
  {
    routineKey:"record-today-money",
    space:"money",
    title:"Record today's income and expenses",
    folder:"Budget",
    list:"Daily Money",
    status:"To Do",
    priority:"High",
    time:"22:20",
    goal:"Close the day with clear income, expenses, savings, and purchase decisions.",
    details:"Record every income and expense for today, update planned purchases, and review future goals.",
    checklist:["Record today's income","Record today's expenses","Review planned purchases","Update future goals"],
  },
  {
    routineKey:"itsinda-weekly-savings",
    space:"money",
    title:"Send 20,000 RWF to ITSINDA",
    folder:"Budget",
    list:"Weekly Savings",
    status:"To Do",
    priority:"Urgent",
    time:"17:30",
    goal:"Protect the weekly ITSINDA savings discipline.",
    details:"Every Friday, send 20,000 RWF to ITSINDA and mark this task as Done after payment.",
    checklist:["Confirm available balance","Send 20,000 RWF to ITSINDA","Record it as savings","Mark this task Done"],
    days:[5],
    amount:ITSINDA_WEEKLY_AMOUNT,
    moneyCategory:"ITSINDA",
  },
  {
    routineKey:"money-savings-review",
    space:"money",
    title:"Money / savings review",
    folder:"Budget",
    list:"Daily Routine",
    status:"To Do",
    priority:"Normal",
    time:"22:30",
    goal:"Stay aware of money, savings, spending, and career investment.",
    details:"Review today’s spending, expected money, savings action, and one decision that protects your future.",
    checklist:["Review spending","Check expected income","Record savings action","Protect 20,000 RWF weekly saving target","Plan tomorrow money decision"],
  },
];

const routineTaskId = (routineKey, routineDate) => `RT-${String(routineDate).replace(/-/g, "")}-${routineKey}`;
const buildRoutineTask = (routine, routineDate) => ({
  id: routineTaskId(routine.routineKey, routineDate),
  space: routine.space,
  title: routine.title,
  folder: routine.folder,
  list: routine.list || "Daily Routine",
  status: routine.status || "To Do",
  priority: routine.priority || "Normal",
  due: routineDate,
  time: routine.time || "",
  goal: routine.goal || "Complete this daily routine.",
  details: routine.details || "",
  checklist: Array.isArray(routine.checklist) ? [...routine.checklist] : ["Complete routine"],
  comments: [],
  isRoutine: true,
  mopasTaskType: routine.space === "mopas" ? (routine.mopasTaskType || "Normal Task") : undefined,
  routineKey: routine.routineKey,
  routineDate,
  amount: routine.amount,
  moneyCategory: routine.moneyCategory,
});
const hasRoutineForDate = (tasks, routineKey, routineDate) => tasks.some(t =>
  (t && t.isRoutine && t.routineKey === routineKey && t.routineDate === routineDate) ||
  (t && t.id === routineTaskId(routineKey, routineDate))
);
const ensureRoutineTasksForDate = (tasks, routineDate = localTodayISO()) => {
  const existing = Array.isArray(tasks) ? tasks : [];
  const routineDay = (parseDateKey(routineDate) || new Date()).getDay();
  const dueRoutines = DAILY_ROUTINES.filter(r => !Array.isArray(r.days) || r.days.includes(routineDay));
  const missing = dueRoutines.filter(r => !hasRoutineForDate(existing, r.routineKey, routineDate)).map(r => buildRoutineTask(r, routineDate));
  return missing.length ? [...missing, ...existing] : existing;
};
const uniqueById = (items) => {
  const seen = new Set();
  return items.filter(item => {
    if (!item || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const readStore = (key, fallback) => {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};
const writeStore = (key, value) => {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
};
const todayISO = () => localTodayISO();
const getDocumentStatus = (doc, warningDays = 30) => {
  if (!doc || !doc.hasExpiry || !doc.expiryDate) return { label: "Active", color: C.green, daysLeft:null };
  const today = parseDateKey(todayISO()) || new Date();
  const expiry = parseDateKey(doc.expiryDate) || new Date(doc.expiryDate);
  if (Number.isNaN(expiry.getTime())) return { label: "Active", color: C.green, daysLeft:null };
  const diffDays = Math.ceil((expiry - today) / 86400000);
  if (diffDays < 0) return { label: "Expired", color: C.red, daysLeft:diffDays };
  if (diffDays <= Number(warningDays || 30)) return { label: "Expiring Soon", color: C.orange, daysLeft:diffDays };
  return { label: "Active", color: C.green, daysLeft:diffDays };
};
const printHtml = (title, body) => {
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title}</title><style>
    body{font-family:Segoe UI,Arial,sans-serif;padding:32px;color:#222;line-height:1.5}
    h1{font-size:22px;margin:0 0 6px;color:#111} h2{font-size:14px;margin:22px 0 6px;color:#e8732a;text-transform:uppercase;letter-spacing:1px}
    .meta{font-size:12px;color:#666;margin-bottom:18px}.box{border:1px solid #ddd;border-radius:10px;padding:14px;margin-bottom:10px;white-space:pre-wrap}
    table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border:1px solid #ddd;padding:8px;text-align:left;vertical-align:top}th{background:#f5f5f5}
  </style></head><body>${body}</body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
};
const escapeHtml = (value) => String(value || "").replace(/[&<>"]/g, ch => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[ch]));


const safeLower = (value) => String(value || "").toLowerCase();
const isSearchOrLogTenderTask = (task = {}) => {
  const text = safeLower([task.title, task.folder, task.list, task.details].filter(Boolean).join(" "));
  return (
    text.includes("search new tender") ||
    text.includes("search and log") ||
    text.includes("log new tender") ||
    text.includes("record opportunities") ||
    text.includes("tender search")
  );
};
const getMopasTaskType = (task = {}) => {
  if (task.space !== "mopas") return "";
  if (MOPAS_TASK_TYPES.includes(task.mopasTaskType)) return task.mopasTaskType;
  if (task.isRoutine || isSearchOrLogTenderTask(task)) return "Normal Task";
  const text = safeLower([task.title, task.folder, task.list, task.details, task.tenderStage].filter(Boolean).join(" "));
  if (
    text.includes("tenders working on") ||
    text.startsWith("tender for ") ||
    text.includes("tender for ") ||
    text.includes("prepare technical proposal") ||
    text.includes("technical proposal") ||
    text.includes("financial proposal") ||
    text.includes("compliance table") ||
    text.includes("final submission") ||
    text.includes("bid security") ||
    task.tenderStage
  ) return "Tender Working On";
  return "Normal Task";
};
const isMopasTenderWork = (task = {}) => task?.space === "mopas" && getMopasTaskType(task) === "Tender Working On";
const isMopasNormalTask = (task = {}) => task?.space === "mopas" && getMopasTaskType(task) !== "Tender Working On";
const getTaskSearchText = (task) => safeLower([
  task?.title, task?.folder, task?.list, task?.details, task?.goal, task?.status,
  task?.priority, task?.mopasTaskType, task?.tenderStage, task?.goalId, task?.keyResultId
].filter(Boolean).join(" "));
const normalizeTask = (task = {}) => {
  const base = {
    checklist: [],
    comments: [],
    status: "To Do",
    priority: "Normal",
    due: "",
    time: "",
    completedAt: "",
    locked: false,
    ...task,
  };
  if (base.space === "mopas") {
    const mopasTaskType = getMopasTaskType(base);
    return {
      ...base,
      mopasTaskType,
      folder: base.folder || (mopasTaskType === "Tender Working On" ? TENDER_WORKING_FOLDER : NORMAL_MOPAS_FOLDER),
      list: base.list || (mopasTaskType === "Tender Working On" ? "Tender Working On" : "Normal MOPAS Tasks"),
      tenderStage: mopasTaskType === "Tender Working On" ? (base.tenderStage || "New") : "",
    };
  }
  return base;
};
const isLateTask = (task) => task && task.status !== "Done" && isDateKey(task.due) && daysBetweenLocal(localTodayISO(), task.due) < 0;
const taskLateInfo = (task) => {
  if (!isLateTask(task)) return { isLate:false, days:0, label:"" };
  const days = Math.abs(daysBetweenLocal(localTodayISO(), task.due) || 0);
  return { isLate:true, days, label: days === 1 ? "Late by 1 day" : `Late by ${days} days` };
};
const compareTaskSmart = (aRaw, bRaw) => {
  const a = normalizeTask(aRaw);
  const b = normalizeTask(bRaw);
  const today = localTodayISO();
  const priorityRank = (task) => task.priority === "Urgent" ? 0 : task.priority === "High" ? 1 : task.priority === "Normal" ? 2 : 3;
  const groupRank = (task) => {
    if (task.status === "Done") return 4;
    if (isLateTask(task)) return 3; // late tasks stay visible but lower in the list
    if (task.status === "Blocked") return 2;
    return 0;
  };
  const activeDueRank = (task) => {
    if (!isDateKey(task.due)) return 7000;
    const diff = daysBetweenLocal(today, task.due);
    if (diff === 0) return 0;
    if (diff === 1) return 50;
    if (diff !== null && diff > 1 && diff <= 7) return 100 + diff;
    if (diff !== null && diff > 7) return 500 + diff;
    return 8000;
  };
  const lateRank = (task) => {
    if (!isDateKey(task.due)) return 9999;
    const diff = daysBetweenLocal(today, task.due);
    return diff === null ? 9999 : Math.abs(diff); // newest late first so very old missed tasks do not dominate
  };
  if (groupRank(a) !== groupRank(b)) return groupRank(a) - groupRank(b);
  if (a.status === "Done" && b.status === "Done") {
    return String(b.completedAt || b.updatedAt || b.due || "").localeCompare(String(a.completedAt || a.updatedAt || a.due || ""))
      || String(a.title || "").localeCompare(String(b.title || ""));
  }
  if (isLateTask(a) && isLateTask(b)) {
    const mopasBoostA = a.space === "mopas" ? -1 : 0;
    const mopasBoostB = b.space === "mopas" ? -1 : 0;
    return (mopasBoostA - mopasBoostB)
      || priorityRank(a) - priorityRank(b)
      || lateRank(a) - lateRank(b)
      || String(a.time || "").localeCompare(String(b.time || ""))
      || String(a.title || "").localeCompare(String(b.title || ""));
  }
  return priorityRank(a) - priorityRank(b)
    || activeDueRank(a) - activeDueRank(b)
    || String(a.time || "").localeCompare(String(b.time || ""))
    || String(a.title || "").localeCompare(String(b.title || ""));
};
const sortTasksSmart = (items) => [...(Array.isArray(items) ? items : [])].sort(compareTaskSmart);
const daysBetweenLocal = (fromKey, toKey) => {
  const from = parseDateKey(fromKey);
  const to = parseDateKey(toKey);
  if (!from || !to) return null;
  return Math.round((to - from) / 86400000);
};
const DEFAULT_STRUCTURED_GOALS = {
  wakeup: [
    { id:"goal-wakeup-discipline", title:"Control the morning", target:7, keywords:["wake up", "read", "plan the day"], keyResults:[
      { id:"kr-wakeup", title:"Wake up at 6:00 AM", keywords:["wake up"] },
      { id:"kr-read", title:"Read 20 pages", keywords:["read"] },
      { id:"kr-plan", title:"Plan top 3 tasks", keywords:["plan the day"] },
    ]},
  ],
  mopas: [
    { id:"goal-mopas-tenders", title:"Win more MOPAS tender opportunities", target:5, keywords:["tender", "proposal", "technical", "financial", "umucyo"], keyResults:[
      { id:"kr-tender-search", title:"Find and log new tender opportunities", keywords:["normal task", "tender search", "umucyo", "search and log"] },
      { id:"kr-proposal", title:"Work on active tenders", keywords:["tenders working on", "tender for", "proposal", "technical", "financial", "submission"] },
      { id:"kr-followup", title:"Follow up clients and deadlines", keywords:["normal task", "follow", "meeting", "quotation", "lpo"] },
    ]},
  ],
  health: [
    { id:"goal-health-energy", title:"Build daily energy and fitness", target:7, keywords:["workout", "mobility", "run", "fitness"], keyResults:[
      { id:"kr-workout", title:"Complete morning workout", keywords:["workout", "mobility"] },
      { id:"kr-run", title:"Run or recovery routine", keywords:["run", "recovery"] },
    ]},
  ],
  drawing: [
    { id:"goal-drawing-skill", title:"Improve drawing and 43 Project foundation", target:7, keywords:["drawingbox", "43 project", "creative study"], keyResults:[
      { id:"kr-drawingbox", title:"Study DrawingBox", keywords:["drawingbox"] },
      { id:"kr-43project", title:"Move 43 Project forward", keywords:["43 project", "felicite"] },
    ]},
  ],
  afterglow: [
    { id:"goal-afterglow-brand", title:"Build AFTERGLOW brand assets", target:7, keywords:["afterglow", "brand", "portfolio", "social"], keyResults:[
      { id:"kr-brand", title:"Improve brand system", keywords:["brand", "logo", "portfolio"] },
      { id:"kr-content", title:"Prepare content ideas", keywords:["social", "content"] },
    ]},
  ],
  money: [
    { id:"goal-money-control", title:"Track spending and savings decisions", target:7, keywords:["money", "savings", "budget"], keyResults:[
      { id:"kr-budget", title:"Review daily spending", keywords:["spending", "budget"] },
      { id:"kr-save", title:"Protect savings action", keywords:["saving", "savings"] },
    ]},
  ],
};
const loadStructuredGoals = () => {
  const stored = readStore(STRUCTURED_GOALS_KEY, null);
  if (stored && typeof stored === "object") return stored;
  writeStore(STRUCTURED_GOALS_KEY, DEFAULT_STRUCTURED_GOALS);
  return DEFAULT_STRUCTURED_GOALS;
};
const getGoalProgress = (tasks, goalsBySpace = loadStructuredGoals()) => {
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const result = {};
  Object.entries(goalsBySpace || {}).forEach(([space, goals]) => {
    result[space] = (Array.isArray(goals) ? goals : []).map(goal => {
      const goalKeywords = [goal.title, ...(goal.keywords || [])].map(safeLower).filter(Boolean);
      const linked = safeTasks.filter(task => task.space === space && (
        task.goalId === goal.id ||
        goalKeywords.some(k => getTaskSearchText(task).includes(k)) ||
        (goal.keyResults || []).some(kr => kr.id === task.keyResultId || (kr.keywords || []).some(k => getTaskSearchText(task).includes(safeLower(k))))
      ));
      const done = linked.filter(t => t.status === "Done").length;
      const target = Number(goal.target) || Math.max(linked.length, 1);
      const pct = Math.min(100, Math.round((done / target) * 100));
      return { ...goal, linkedCount: linked.length, doneCount: done, progress: pct };
    });
  });
  return result;
};
const getRoutineStreak = (tasks, routineKey, todayKey = localTodayISO()) => {
  const safe = Array.isArray(tasks) ? tasks : [];
  let streak = 0;
  for (let i = 0; i < 365; i += 1) {
    const key = addDaysISO(todayKey, -i);
    const done = safe.some(t => t.isRoutine && t.routineKey === routineKey && t.routineDate === key && t.status === "Done");
    if (!done) break;
    streak += 1;
  }
  return streak;
};
const downloadTextFile = (filename, content, type = "application/json") => {
  try {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  } catch {}
};
const buildAppBackup = (tasks) => ({
  app:"AFTERGLOW / MOPAS Workspace",
  version:APP_BACKUP_VERSION,
  exportedAt:new Date().toISOString(),
  localDate:localTodayISO(),
  tasks:Array.isArray(tasks) ? tasks : [],
  documents:readStore(DOCUMENTS_KEY, []),
  dailyReports:readStore(DAILY_REPORT_KEY, []),
  endDayReviews:readStore(END_DAY_REVIEW_KEY, []),
  goalsText:readStore(Goals_TEXT_KEY, {}),
  structuredGoals:loadStructuredGoals(),
  settings:loadAppSettings(),
});

const rwf = (value) => `${Number(value || 0).toLocaleString()} RWF`;
const numberValue = (value) => Number(String(value || "").replace(/,/g, "")) || 0;
const moneyProgress = (saved, target) => {
  const s = numberValue(saved);
  const t = numberValue(target);
  return t > 0 ? Math.min(100, Math.round((s / t) * 100)) : 0;
};
const getWeekRangeKeys = (baseDate = new Date()) => {
  const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  start.setDate(start.getDate() - start.getDay());
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start:dateKey(start), end:dateKey(end) };
};
const DEFAULT_PURCHASE_GOALS = [
  { id:"PG-laptop", title:"Laptop", targetAmount:1200000, savedAmount:0, priority:"High", deadline:"", note:"Main work tool upgrade" },
  { id:"PG-tablet", title:"Drawing tablet", targetAmount:500000, savedAmount:0, priority:"High", deadline:"", note:"Creative production tool" },
];
const DEFAULT_FUTURE_GOALS = [
  { id:"FG-land", title:"Buy Land", targetAmount:0, savedAmount:0, deadline:"", category:"Life Goal", note:"Long-term foundation" },
  { id:"FG-studio", title:"Open AFTERGLOW Studio", targetAmount:0, savedAmount:0, deadline:"", category:"Business Goal", note:"Creative studio future" },
];


const TODAY_DISCIPLINE_BLOCKS = [
  { start:"06:00", end:"06:10", period:"Morning", title:"Wake up, drink water, make bed", routineKey:"wake-up" },
  { start:"06:10", end:"06:50", period:"Morning", title:"Read 20 pages", routineKey:"read-20-pages" },
  { start:"06:50", end:"07:20", period:"Morning", title:"Morning workout / mobility", routineKey:"morning-workout" },
  { start:"07:20", end:"08:15", period:"Morning", title:"Breakfast, shower, prepare" },
  { start:"08:15", end:"08:35", period:"Morning", title:"Plan the day and choose top 3 tasks", routineKey:"plan-top-3" },
  { start:"08:45", end:"12:00", period:"Workday", title:"MOPAS priority work: proposals, deadlines, follow-up" },
  { start:"12:00", end:"13:00", period:"Workday", title:"Search new MOPAS tenders", routineKey:"search-mopas-tenders" },
  { start:"13:00", end:"17:00", period:"Workday", title:"MOPAS follow-up, tender preparation, operations" },
  { start:"17:00", end:"18:00", period:"Workday", title:"Admin follow-up / messages / tomorrow preparation" },
  { start:"18:30", end:"19:15", period:"Evening", title:"Run, workout, or recovery", routineKey:"evening-health-training" },
  { start:"20:00", end:"21:00", period:"Evening", title:"DrawingBox study", routineKey:"drawingbox-study" },
  { start:"21:00", end:"22:00", period:"Night", title:"43 Project / creative study", routineKey:"43-project-creative-study" },
  { start:"22:00", end:"22:45", period:"Night", title:"AFTERGLOW brand work or portfolio", routineKey:"afterglow-brand-work" },
  { start:"22:45", end:"23:00", period:"Night", title:"End Day Review + money/savings review", routineKey:"end-day-review" },
  { start:"23:00", end:"23:59", period:"Night", title:"Sleep" },
];


const LIFE_OS_PILLARS = [
  { id:"morning", space:"wakeup", label:"Morning Control", target:"Wake mind, body, and direction", routineKeys:["wake-up", "read-20-pages", "plan-top-3"] },
  { id:"mopas", space:"mopas", label:"MOPAS Production", target:"Move tender, client, document, or money work", routineKeys:["search-mopas-tenders"] },
  { id:"health", space:"health", label:"Health Energy", target:"Morning activation + evening reset", routineKeys:["morning-workout", "evening-health-training"] },
  { id:"drawing", space:"drawing", label:"Drawing / 43 Project", target:"Leave evidence of skill growth", routineKeys:["drawingbox-study", "43-project-creative-study"] },
  { id:"afterglow", space:"afterglow", label:"AFTERGLOW Brand", target:"Build one creative asset or idea", routineKeys:["afterglow-brand-work"] },
  { id:"money", space:"money", label:"Money Discipline", target:"Track spending and protect savings", routineKeys:["money-savings-review"] },
];

const FIRST_7_DAY_TEST = [
  { label:"Wake up and protect the first 30 minutes", routineKey:"wake-up" },
  { label:"Read 20 pages or minimum 10", routineKey:"read-20-pages" },
  { label:"Plan top 3 tasks", routineKey:"plan-top-3" },
  { label:"Move one MOPAS tender/money action", routineKey:"search-mopas-tenders" },
  { label:"Train body or recovery smart", routineKey:"evening-health-training" },
  { label:"Save drawing / creative evidence", routineKey:"drawingbox-study" },
  { label:"Close day and prepare tomorrow", routineKey:"end-day-review" },
];

const formatHumanDate = (dateKeyValue) => {
  const d = parseDateKey(dateKeyValue) || new Date();
  try {
    return d.toLocaleDateString(undefined, { weekday:"long", year:"numeric", month:"long", day:"numeric" });
  } catch {
    return dateKeyValue;
  }
};

const listText = (items, fallback = "None") => {
  const safe = Array.isArray(items) ? items.filter(Boolean) : [];
  return safe.length ? safe.join("\n") : fallback;
};

const buildTodayDisciplinePlanEmail = (tasks, settings) => {
  const safeTasks = Array.isArray(tasks) ? tasks.map(normalizeTask) : [];
  const merged = mergeAppSettings(settings || loadAppSettings());
  const todayKey = localTodayISO();
  const humanDate = formatHumanDate(todayKey);
  const emailTo = String(merged.notifications.emailAddress || "").trim();
  const now = new Date();
  const nowLabel = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  const warningDays = Number(merged.documents.expiryWarningDays || 30);
  const docs = Array.isArray(readStore(DOCUMENTS_KEY, [])) ? readStore(DOCUMENTS_KEY, []) : [];
  const docsWithStatus = docs.map(doc => ({ ...doc, statusInfo:getDocumentStatus(doc, warningDays) }));
  const expiringDocs = docsWithStatus
    .filter(doc => doc.statusInfo.label === "Expired" || doc.statusInfo.label === "Expiring Soon")
    .sort((a, b) => String(a.expiryDate || "9999-12-31").localeCompare(String(b.expiryDate || "9999-12-31")));
  const timeToMinutes = (time) => {
    const [h, m] = String(time || "00:00").split(":").map(Number);
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  };
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const taskStartTime = (task) => {
    if (task?.time) return task.time;
    if (task?.isRoutine && task?.routineKey) {
      const routine = DAILY_ROUTINES.find(r => r.routineKey === task.routineKey);
      if (routine?.time) return routine.time;
    }
    return "";
  };
  const spaceName = (id) => SPACES.find(s => s.id === id)?.name || id || "General";
  const openTasks = safeTasks.filter(t => t.status !== "Done");
  const todayTasks = openTasks.filter(t => isDateKey(t.due) && t.due === todayKey);
  const lateTasks = openTasks.filter(isLateTask).sort(compareTaskSmart);
  const routineToday = safeTasks.filter(t => t.isRoutine && t.routineDate === todayKey);
  const routineDone = routineToday.filter(t => t.status === "Done").length;
  const routineTotal = DAILY_ROUTINES.length;
  const currentBlock = TODAY_DISCIPLINE_BLOCKS.find(block => nowMinutes >= timeToMinutes(block.start) && nowMinutes < timeToMinutes(block.end));
  const nextBlock = TODAY_DISCIPLINE_BLOCKS.find(block => timeToMinutes(block.start) > nowMinutes);
  const blockTitle = currentBlock ? currentBlock.title : "Outside the planned schedule";
  const blockStart = currentBlock ? currentBlock.start : nowLabel;
  const blockEnd = currentBlock ? currentBlock.end : "";
  const actionWindow = Math.max(15, Number(merged.notifications.actionWindowMinutes || 60));
  const inWindow = (task) => {
    const start = taskStartTime(task);
    if (!start) return false;
    const diff = timeToMinutes(start) - nowMinutes;
    return diff >= -10 && diff <= actionWindow;
  };
  const tasksForCurrentBlock = openTasks.filter(task => {
    if (currentBlock?.routineKey && task.isRoutine && task.routineKey === currentBlock.routineKey && task.routineDate === todayKey) return true;
    if (currentBlock?.period === "Workday" && task.space === "mopas" && (task.due === todayKey || task.priority === "Urgent" || task.priority === "High" || inWindow(task))) return true;
    if (inWindow(task)) return true;
    return false;
  });
  const topActiveCandidates = [
    ...tasksForCurrentBlock,
    ...todayTasks,
    ...openTasks.filter(t => t.priority === "Urgent" || t.priority === "High"),
    ...openTasks.filter(t => t.isRoutine && t.routineDate === todayKey),
  ];
  const seen = new Set();
  const activeCandidates = topActiveCandidates.filter(task => {
    if (!task || seen.has(task.id) || task.status === "Done") return false;
    seen.add(task.id);
    return true;
  });
  const activeTask = sortTasksSmart(activeCandidates)[0] || sortTasksSmart(openTasks)[0] || null;
  const startLabel = activeTask ? (taskStartTime(activeTask) || blockStart || "Now") : (blockStart || "Now");
  const dueLabel = activeTask?.due ? activeTask.due : "No deadline set";
  const why = activeTask?.goal || activeTask?.details || (currentBlock ? `This block is for ${currentBlock.title}.` : "This keeps the day moving forward.");
  const checklist = Array.isArray(activeTask?.checklist) ? activeTask.checklist : [];
  const cleanChecklist = checklist.map(item => typeof item === "object" ? item.text : item).filter(Boolean).slice(0, 3);
  const nextSteps = cleanChecklist.length ? cleanChecklist : ["Open the task in AFTERGLOW", "Work on the next visible step", "Mark progress before leaving this block"];
  const endDayTime = merged.routine.endDayReviewTime || "22:45";
  const endDayMinutes = timeToMinutes(endDayTime);
  const isEndDayTime = nowMinutes >= endDayMinutes;
  const actionTitle = isEndDayTime ? "End Day Review" : activeTask?.title || blockTitle;
  const actionSpace = isEndDayTime ? "Dashboard / End Day Review" : activeTask ? spaceName(activeTask.space) : "Daily Discipline Plan";
  const actionWhy = isEndDayTime ? "Close today, save progress, move unfinished normal tasks to tomorrow, and prepare tomorrow routine tasks." : why;
  const urgencyLine = isEndDayTime ? `Start now: ${endDayTime}` : `Start: ${startLabel}${blockEnd ? ` · Current block: ${blockStart}-${blockEnd}` : ""} · Due: ${dueLabel}`;
  const tone = String(merged.notifications.emailTone || "Direct");
  const greeting = tone === "Motivational" ? "Keep the day under control. One action now." : tone === "Strict" ? "Do this now. Do not delay." : "Here is your current action.";
  const lateNote = merged.notifications.includeLateWarningInCurrentEmail && lateTasks.length ? `${lateTasks.length} late task${lateTasks.length === 1 ? "" : "s"} are marked in the app. Handle active work first, then clear late items.` : "";
  const docNote = merged.notifications.includeDocumentAlertInCurrentEmail && expiringDocs.length ? `${expiringDocs.length} document${expiringDocs.length === 1 ? "" : "s"} expired or expiring soon.` : "";
  const routineNote = merged.notifications.includeRoutineProgressInCurrentEmail ? `Routine progress today: ${routineDone}/${routineTotal}.` : "";
  const nextBlockNote = merged.notifications.includeNextBlock && nextBlock ? `Next block: ${nextBlock.start}-${nextBlock.end} · ${nextBlock.title}.` : "";
  const subjectPrefix = String(merged.notifications.emailSubjectPrefix || "AFTERGLOW").trim() || "AFTERGLOW";
  const subject = `${subjectPrefix} ACTION — ${nowLabel} — ${actionTitle}`;
  const css = "font-family:Segoe UI,Arial,sans-serif;color:#222;line-height:1.55";
  const stepHtml = nextSteps.map((step, index) => `<li style="margin-bottom:8px"><strong>${index + 1}.</strong> ${escapeHtml(step)}</li>`).join("");
  const htmlBody = `
    <div style="${css};max-width:680px;margin:0 auto;padding:20px;background:#fafafa">
      <div style="background:#1f1f1f;color:#f5f0e8;border-radius:16px;padding:22px;margin-bottom:14px">
        <div style="color:#d4a853;font-size:12px;letter-spacing:2px;font-weight:800">${escapeHtml(subjectPrefix)} / MOPAS</div>
        <h1 style="margin:6px 0 4px;font-size:24px">Current Action</h1>
        <div style="color:#b8b0a0">${escapeHtml(humanDate)} · ${escapeHtml(nowLabel)} Kigali time</div>
      </div>
      <div style="background:#fff;border:1px solid #e6e0d8;border-left:5px solid #e8732a;border-radius:14px;padding:18px;margin-bottom:14px">
        <div style="font-size:12px;color:#777;letter-spacing:1.5px;font-weight:800;text-transform:uppercase">${escapeHtml(greeting)}</div>
        <h2 style="margin:6px 0 8px;font-size:22px;color:#e8732a">${escapeHtml(actionTitle)}</h2>
        <p style="margin:0;color:#333"><strong>${escapeHtml(urgencyLine)}</strong></p>
        <p style="margin:8px 0 0;color:#666">Space: <strong>${escapeHtml(actionSpace)}</strong></p>
        ${merged.notifications.includeWhyInEmail !== false ? `<p style="margin:8px 0 0;color:#555">Why: ${escapeHtml(actionWhy)}</p>` : ""}
      </div>
      <div style="background:#fff;border:1px solid #e6e0d8;border-radius:14px;padding:18px;margin-bottom:14px">
        <h3 style="margin:0 0 10px;font-size:16px;color:#222">Next steps</h3>
        <ol style="margin:0;padding-left:20px">${stepHtml}</ol>
      </div>
      <div style="background:#fff;border:1px solid #e6e0d8;border-radius:14px;padding:14px;color:#555;font-size:13px">
        ${routineNote ? `<div>${escapeHtml(routineNote)}</div>` : ""}
        ${nextBlockNote ? `<div>${escapeHtml(nextBlockNote)}</div>` : ""}
        ${lateNote ? `<div style="color:#c84f1d;font-weight:700">${escapeHtml(lateNote)}</div>` : ""}
        ${docNote ? `<div style="color:#c84f1d;font-weight:700">${escapeHtml(docNote)}</div>` : ""}
      </div>
    </div>`;
  const textBody = [
    `${subjectPrefix} ACTION — ${humanDate}`,
    `Time: ${nowLabel} Kigali time`,
    "",
    greeting,
    `Action: ${actionTitle}`,
    urgencyLine,
    `Space: ${actionSpace}`,
    merged.notifications.includeWhyInEmail !== false ? `Why: ${actionWhy}` : "",
    "",
    "Next steps:",
    ...nextSteps.map((step, index) => `${index + 1}. ${step}`),
    "",
    routineNote,
    nextBlockNote,
    lateNote,
    docNote,
  ].filter(Boolean).join("\n");
  return { action:"sendEmail", notificationType:"currentAction", to:emailTo, subject, body:textBody, htmlBody, date:todayKey, generatedAt:new Date().toISOString() };
};


const SEEDS = [
  { id:"WA-001", space:"wakeup", title:"Wake up 6:00 AM", folder:"Morning Routine", list:"Daily", status:"To Do", priority:"Urgent", due:"", time:"06:00", goal:"Start the day with control.", details:"No phone first 30 minutes. Drink water. Make bed.", checklist:["Drink water","Make bed","No phone 30 min"], comments:[] },
  { id:"WA-002", space:"wakeup", title:"Read 20 pages", folder:"Reading", list:"Daily", status:"To Do", priority:"High", due:"", time:"06:10", goal:"Learn one idea, one sentence, one action.", details:"Read with pen and notebook.", checklist:["Write one idea","Write one sentence","Write one action"], comments:[] },
  { id:"MO-001", space:"mopas", title:"Search and log new tenders", folder:TENDER_SEARCH_FOLDER, list:"Normal MOPAS Tasks", status:"To Do", priority:"High", due:"", time:"12:00", goal:"Find opportunities and record them clearly.", details:"Normal MOPAS task: check Umucyo, institutional sites, emails, New Times, and Job in Rwanda.", checklist:["Check Umucyo","Check emails","Check tender websites","Log found tenders"], comments:[], mopasTaskType:"Normal Task" },
  { id:"MO-002", space:"mopas", title:"Tender for production of Multimedia contents to Rwamagana District", folder:TENDER_WORKING_FOLDER, list:"Tender Working On", status:"To Do", priority:"Urgent", due:"", time:"09:00", goal:"Prepare and submit a winning tender package.", details:"Active tender work: technical proposal, financial offer, compliance table, admin documents, references, and final submission proof.", checklist:["Create tender folder","Check required documents","Draft technical proposal","Prepare financial offer","Review compliance","Save submission proof"], comments:[], mopasTaskType:"Tender Working On", tenderStage:"Preparing", requestedDocuments:"RDB, RRA, RSSB, VAT, beneficial ownership, bid security/declaration, company profile", missingDocuments:"" },
  { id:"HE-001", space:"health", title:"Morning push-ups & mobility", folder:"Morning Workout", list:"Daily", status:"To Do", priority:"Normal", due:"", time:"06:50", goal:"Build energy.", details:"30 push-ups, squats, stretching, core, plank.", checklist:["30 push-ups","Squats","Stretching","Plank"], comments:[] },
  { id:"HE-002", space:"health", title:"Evening 4km run", folder:"Evening Run", list:"Mon/Tue/Thu/Sat", status:"To Do", priority:"High", due:"", time:"18:30", goal:"Build endurance and discipline.", details:"Run 4km on scheduled days. Walk/recover on off days.", checklist:["Warm up","Run 4km","Cool down stretch"], comments:[] },
  { id:"DR-001", space:"drawing", title:"DrawingBox warm-up", folder:"DrawingBox Study", list:"Daily", status:"To Do", priority:"Normal", due:"", time:"20:00", goal:"Improve drawing skill.", details:"30 min warm-up lines, shapes, perspective.", checklist:["Lines","Shapes","Perspective"], comments:[] },
  { id:"DR-002", space:"drawing", title:"43 Project research", folder:"43 Project", list:"Tuesday", status:"To Do", priority:"High", due:"", time:"22:00", goal:"Develop the Felicite story.", details:"Story, visual, style, and pipeline research.", checklist:["Story research","Visual references","Style examples"], comments:[] },
  { id:"AF-001", space:"afterglow", title:"Fix tagline: Stories That Stay", folder:"Brand System", list:"Urgent", status:"To Do", priority:"Urgent", due:"", time:"", goal:"Correct all logo files.", details:"Current says Saty. Must be Stay.", checklist:["Fix logo PDF","Fix SVG","Fix PNG versions"], comments:[] },
  { id:"AF-002", space:"afterglow", title:"Set up Instagram page", folder:"Social Media", list:"This Week", status:"To Do", priority:"High", due:"", time:"", goal:"Start building online presence.", details:"Bio, profile pic, first 3 posts planned.", checklist:["Write bio","Upload logo","Plan 3 posts"], comments:[] },
  { id:"MN-001", space:"money", title:"Set up 50/20/20/10 rule", folder:"Budget", list:"Setup", status:"To Do", priority:"High", due:"", time:"", goal:"Discipline with money.", details:"50% needs, 20% savings, 20% career, 10% personal.", checklist:["Calculate monthly income","Set amounts","Open savings method"], comments:[] },
];

const Badge = ({ children, color }) => (
  <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:12, fontSize:11, fontWeight:600, background:color+"22", color, letterSpacing:.5, whiteSpace:"nowrap" }}>{children}</span>
);

const Btn = ({ children, onClick, orange, small, ghost, style, disabled }) => (
  <button disabled={disabled} onClick={onClick} style={{
    padding: small ? "4px 12px" : "8px 18px", borderRadius: 8, border: ghost ? "1px solid "+C.border : "none",
    cursor: disabled ? "not-allowed" : "pointer", background: orange ? C.orange : ghost ? "transparent" : C.elevated,
    color: orange ? "#fff" : C.cream, fontSize: small ? 12 : 13, fontWeight: 600, transition: "all .15s", opacity: disabled ? .5 : 1, ...style,
  }}>{children}</button>
);

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 12 }}>
    {label && <label style={{ display:"block", fontSize:11, color:C.creamSoft, marginBottom:4, letterSpacing:1 }}>{label}</label>}
    <input {...props} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid "+C.border, background:C.bg, color:C.cream, fontSize:13, outline:"none", boxSizing:"border-box", ...props.style }} />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ display:"block", fontSize:11, color:C.creamSoft, marginBottom:4, letterSpacing:1 }}>{label}</label>}
    <select {...props} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid "+C.border, background:C.bg, color:C.cream, fontSize:13, outline:"none", boxSizing:"border-box" }}>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const Textarea = ({ label, ...props }) => (
  <div style={{ marginBottom:12 }}>
    {label && <label style={{ display:"block", fontSize:11, color:C.creamSoft, marginBottom:4, letterSpacing:1 }}>{label}</label>}
    <textarea {...props} rows={3} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid "+C.border, background:C.bg, color:C.cream, fontSize:13, outline:"none", resize:"vertical", boxSizing:"border-box", fontFamily:"inherit" }} />
  </div>
);

const logoHeightFromSetting = (size) => size === "small" ? 58 : size === "large" ? 96 : 78;
const Logo = ({ size = "medium" }) => (
  <div style={{ display:"flex", alignItems:"center", gap:12, padding:"4px 0" }}>
    <img src={LOGO_SRC} alt="AFTERGLOW"
      style={{ height:logoHeightFromSetting(size), maxWidth:"100%", objectFit:"contain", transition:"height .2s" }}
      onError={(e) => { e.target.style.display="none"; e.target.nextSibling.style.display="flex"; }} />
    <div style={{ display:"none", width:36, height:36, borderRadius:"50%", background:"radial-gradient(circle at 40% 40%, "+C.orange+", "+C.gold+")", boxShadow:"0 0 18px "+C.orange+"55", alignItems:"center", justifyContent:"center" }}>
      <span style={{ fontSize:16 }}>✦</span>
    </div>
  </div>
);

const PNL = {
  get background() { return C.surface; },
  get borderRadius() { return C.radius || 12; },
  get padding() { return C.panelPadding || 20; },
  get border() { return "1px solid " + C.border; },
};

const THEME_PRESETS = {
  dark:{ bg:"#1a1a1a", surface:"#232323", elevated:"#2c2c2c", border:"#3a3a3a", text:"#f5f0e8", muted:"#888", cream:"#f5f0e8", creamSoft:"#b8b0a0" },
  darker:{ bg:"#101010", surface:"#171717", elevated:"#202020", border:"#303030", text:"#f5f0e8", muted:"#777", cream:"#f5f0e8", creamSoft:"#b8b0a0" },
};
const ACCENT_PRESETS = {
  orange:"#e8732a", gold:"#d4a853", blue:"#5b9bd5", green:"#4caf50", purple:"#9c6ade",
};
const applyAppearanceSettings = (settings) => {
  const merged = mergeAppSettings(settings || {});
  const appearance = merged.appearance || {};
  const theme = THEME_PRESETS[appearance.theme] || THEME_PRESETS.dark;
  const accent = ACCENT_PRESETS[appearance.accentColor] || ACCENT_PRESETS.orange;
  const radius = appearance.borderRadius === "soft" ? 8 : appearance.borderRadius === "extra rounded" ? 18 : 12;
  const padding = appearance.panelSpacing === "tight" || appearance.cardDensity === "compact" || appearance.compactMode ? 14 : appearance.panelSpacing === "wide" ? 24 : 20;
  Object.assign(C, {
    bg:theme.bg, surface:theme.surface, elevated:theme.elevated, border:theme.border,
    text:theme.text, muted:theme.muted, cream:theme.cream, creamSoft:theme.creamSoft, orange:accent,
    radius, panelPadding:padding,
  });
  SPACES.forEach(space => {
    if (space.id === "wakeup" || space.id === "money") space.color = C.gold;
    if (space.id === "mopas") space.color = C.blue;
    if (space.id === "health") space.color = C.green;
    if (space.id === "drawing") space.color = C.purple;
    if (space.id === "afterglow") space.color = C.orange;
  });
};

const emptyForm = { title:"", folder:"", list:"", status:"To Do", priority:"Normal", due:"", time:"", goal:"", details:"", checklist:"" };

function NewTaskModal({ space, onSave, onClose }) {
  const sp = SPACES.find(s => s.id === space) || SPACES[0];
  const isMopas = space === "mopas";
  const defaultMopasType = "Normal Task";
  const folderOptionsForType = (type) => isMopas
    ? (type === "Tender Working On" ? [TENDER_WORKING_FOLDER] : [NORMAL_MOPAS_FOLDER, TENDER_SEARCH_FOLDER, "Follow-up", "Company Tasks"])
    : sp.folders;
  const [form, setForm] = useState({
    ...emptyForm,
    mopasTaskType: isMopas ? defaultMopasType : "",
    folder: isMopas ? NORMAL_MOPAS_FOLDER : sp.folders[0],
    list: isMopas ? "Normal MOPAS Tasks" : "",
  });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const setMopasTaskType = (e) => {
    const value = e.target.value;
    setForm(f => ({
      ...f,
      mopasTaskType:value,
      folder:value === "Tender Working On" ? TENDER_WORKING_FOLDER : NORMAL_MOPAS_FOLDER,
      list:value === "Tender Working On" ? "Tender Working On" : "Normal MOPAS Tasks",
      priority:value === "Tender Working On" && f.priority === "Normal" ? "High" : f.priority,
    }));
  };
  const submit = () => {
    if (!form.title.trim()) return;
    const raw = String(form.checklist || "");
    const clItems = raw.replace(/,/g, "\n").split("\n").map(s => s.trim()).filter(Boolean);
    const prefix = space.slice(0,3).toUpperCase();
    const mopasType = isMopas ? (form.mopasTaskType || "Normal Task") : "";
    onSave({
      id: prefix + "-" + String(Date.now()).slice(-6),
      space,
      title: form.title.trim(),
      folder: form.folder || (mopasType === "Tender Working On" ? TENDER_WORKING_FOLDER : sp.folders[0]),
      list: form.list || (mopasType === "Tender Working On" ? "Tender Working On" : "New Tasks"),
      status: form.status,
      priority: form.priority,
      due: form.due,
      time: form.time,
      goal: form.goal || (mopasType === "Tender Working On" ? "Prepare this tender to submission standard." : "Move this task forward."),
      details: form.details || "",
      checklist: clItems.length ? clItems : (mopasType === "Tender Working On"
        ? ["Create tender folder","Check required documents","Prepare technical proposal","Prepare financial offer","Save submission proof"]
        : ["Define next action"]),
      comments: [],
      ...(isMopas ? {
        mopasTaskType:mopasType,
        tenderStage:mopasType === "Tender Working On" ? "New" : "",
        requestedDocuments:mopasType === "Tender Working On" ? "" : undefined,
        missingDocuments:mopasType === "Tender Working On" ? "" : undefined,
      } : {}),
    });
  };
  const folderOptions = folderOptionsForType(form.mopasTaskType);
  return (
    <div style={{ position:"fixed", inset:0, background:"#000a", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.surface, borderRadius:16, padding:28, width:500, maxWidth:"95vw", maxHeight:"90vh", overflowY:"auto", border:"1px solid "+C.border }}>
        <h3 style={{ color:C.gold, marginTop:0, letterSpacing:2, fontSize:13 }}>{"NEW TASK — " + sp.name}</h3>
        {isMopas && (
          <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, padding:12, marginBottom:12 }}>
            <Select label="MOPAS TASK TYPE" options={MOPAS_TASK_TYPES} value={form.mopasTaskType} onChange={setMopasTaskType} />
            <div style={{ color:C.creamSoft, fontSize:12, lineHeight:1.5 }}>
              <strong style={{ color:C.gold }}>Tender Working On</strong> = a real tender you are preparing, for example: Tender for production of Multimedia contents to Rwamagana District.<br />
              <strong style={{ color:C.blue }}>Normal Task</strong> = daily work like search and log new tenders, calls, documents, reports, or follow-ups.
            </div>
          </div>
        )}
        <Input label="TITLE" placeholder={isMopas && form.mopasTaskType === "Tender Working On" ? "Tender for production of Multimedia contents to Rwamagana District" : "Task name..."} value={form.title} onChange={set("title")} />
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Select label="FOLDER" options={folderOptions} value={form.folder} onChange={set("folder")} />
          <Input label="LIST" placeholder="e.g. Daily" value={form.list} onChange={set("list")} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Select label="STATUS" options={STATUSES} value={form.status} onChange={set("status")} />
          <Select label="PRIORITY" options={PRIORITIES} value={form.priority} onChange={set("priority")} />
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <Input label="DUE DATE" type="date" value={form.due} onChange={set("due")} />
          <Input label="TIME" type="time" value={form.time} onChange={set("time")} />
        </div>
        <Input label="GOAL" placeholder="What does completing this achieve?" value={form.goal} onChange={set("goal")} />
        <Textarea label="DETAILS" placeholder="Add context..." value={form.details} onChange={set("details")} />
        <Textarea label="CHECKLIST (one per line or comma-separated)" placeholder={"Step 1\nStep 2\nStep 3"} value={form.checklist} onChange={set("checklist")} />
        <div style={{ display:"flex", gap:10, marginTop:8, justifyContent:"flex-end" }}>
          <Btn ghost onClick={onClose}>Cancel</Btn>
          <Btn orange onClick={submit} disabled={!form.title.trim()}>Create Task</Btn>
        </div>
      </div>
    </div>
  );
}

function TaskDetail({ task, onUpdate, onDelete }) {
  const [newItem, setNewItem] = useState("");
  const [newComment, setNewComment] = useState("");
  const [titleDraft, setTitleDraft] = useState(task ? task.title : "");

  useEffect(() => { setTitleDraft(task ? task.title : ""); }, [task?.id, task?.title]);

  const saveTitle = () => {
    if (!task || task.status === "Done" || !titleDraft.trim()) return;
    onUpdate({ ...task, title: titleDraft.trim() });
  };

  if (!task) return (
    <div style={{ ...PNL, display:"flex", alignItems:"center", justifyContent:"center", minHeight:300, color:C.muted, fontSize:14 }}>
      Select a task to see details
    </div>
  );

  const addComment = () => {
    if (task.status === "Done" || !newComment.trim()) return;
    const c = { text: newComment.trim(), time: new Date().toLocaleString() };
    onUpdate({ ...task, comments: [...(task.comments || []), c] });
    setNewComment("");
  };

  const toggleCheck = (i) => {
    if (task.status === "Done") return;
    const cl = [...task.checklist];
    if (typeof cl[i] === "object") cl[i] = { ...cl[i], done: !cl[i].done };
    else cl[i] = { text: cl[i], done: true };
    onUpdate({ ...task, checklist: cl });
  };

  const removeCheck = (i) => {
    if (task.status === "Done") return;
    onUpdate({ ...task, checklist: task.checklist.filter((_, idx) => idx !== i) });
  };

  const addCheck = () => {
    if (task.status === "Done" || !newItem.trim()) return;
    onUpdate({ ...task, checklist: [...task.checklist, newItem.trim()] });
    setNewItem("");
  };

  const cycleStatus = () => {
    if (task.status === "Done") return;
    const i = STATUSES.indexOf(task.status);
    onUpdate({ ...task, status: STATUSES[(i + 1) % STATUSES.length] });
  };

  const isCompleted = task.status === "Done";
  const reopenTask = () => onUpdate({ ...task, status:"To Do", locked:false, completedAt:"" });
  const items = task.checklist.map(c => typeof c === "object" ? c : { text: c, done: false });
  const done = items.filter(c => c.done).length;
  const comments = task.comments || [];

  return (
    <div style={{
      ...PNL,
      overflowY: "auto",
      maxHeight: "calc(100vh - 160px)",
      minWidth: 0,
      maxWidth: "100%",
      wordBreak: "break-word",
      overflowWrap: "anywhere",
      boxSizing: "border-box",
      opacity: isCompleted ? .72 : 1,
      borderColor: isCompleted ? C.green : C.border,
    }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div style={{ minWidth:0, flex:1, marginRight:8 }}>
          <div style={{ color:C.gold, fontSize:11, letterSpacing:2 }}>{task.id}</div>
          <div style={{ display:"flex", gap:8, alignItems:"center", marginTop:4 }}>
            <input disabled={isCompleted} value={titleDraft} onChange={e => setTitleDraft(e.target.value)} onKeyDown={e => e.key === "Enter" && saveTitle()}
              style={{ flex:1, minWidth:0, padding:"7px 10px", borderRadius:8, border:"1px solid "+C.border, background:C.bg, color:isCompleted ? C.muted : C.cream, fontSize:15, fontWeight:700, outline:"none", boxSizing:"border-box", opacity:isCompleted ? .7 : 1 }} />
            <Btn small onClick={saveTitle} disabled={isCompleted || !titleDraft.trim() || titleDraft.trim() === task.title}>Save</Btn>
          </div>
        </div>
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", justifyContent:"flex-end" }}>
          {isCompleted && <Btn small orange onClick={reopenTask}>Reopen</Btn>}
          <Btn small ghost onClick={() => onDelete(task.id)} style={{ color:C.red, borderColor:C.red, flexShrink:0 }}>Delete</Btn>
        </div>
      </div>

      <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
        <Badge color={statusColor(task.status)}>{task.status}</Badge>
        {isCompleted && <Badge color={C.green}>Completed · Locked</Badge>}
        <Badge color={priorityColor(task.priority)}>{task.priority}</Badge>
        {task.due && <Badge color={C.creamSoft}>{"\uD83D\uDCC5 "+task.due}</Badge>}
        {task.time && <Badge color={C.creamSoft}>{"\u23F0 "+task.time}</Badge>}
      </div>

      <Btn small ghost disabled={isCompleted} onClick={cycleStatus} style={{ marginBottom:14 }}>{isCompleted ? "Task locked after completion" : "Cycle Status \u2192"}</Btn>

      <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:12, marginBottom:14 }}>
        <div style={{ fontSize:11, color:C.gold, letterSpacing:2, marginBottom:8 }}>SMART FIELDS</div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:10 }}>
          <Select label="STATUS" disabled={isCompleted} options={STATUSES} value={task.status || "To Do"} onChange={e => onUpdate({ ...task, status:e.target.value })} />
          <Select label="PRIORITY" disabled={isCompleted} options={PRIORITIES} value={task.priority || "Normal"} onChange={e => onUpdate({ ...task, priority:e.target.value })} />
          <Input label="DUE DATE" disabled={isCompleted} type="date" value={task.due || ""} onChange={e => onUpdate({ ...task, due:e.target.value })} />
          <Input label="TIME" disabled={isCompleted} type="time" value={task.time || ""} onChange={e => onUpdate({ ...task, time:e.target.value })} />
        </div>
        <Input label="GOAL LINK / NOTE" disabled={isCompleted} value={task.goal || ""} onChange={e => onUpdate({ ...task, goal:e.target.value })} placeholder="Link this task to a goal or write the goal it supports" />
        {task.space === "mopas" && (
          <>
            <Select
              label="MOPAS TASK TYPE"
              disabled={isCompleted}
              options={MOPAS_TASK_TYPES}
              value={getMopasTaskType(task)}
              onChange={e => {
                const value = e.target.value;
                onUpdate({
                  ...task,
                  mopasTaskType:value,
                  folder:value === "Tender Working On" ? TENDER_WORKING_FOLDER : NORMAL_MOPAS_FOLDER,
                  list:value === "Tender Working On" ? "Tender Working On" : "Normal MOPAS Tasks",
                  tenderStage:value === "Tender Working On" ? (task.tenderStage || "New") : "",
                });
              }}
            />
            {getMopasTaskType(task) === "Tender Working On" ? (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:10 }}>
                <Select label="TENDER STAGE" disabled={isCompleted} options={TENDER_STAGES} value={task.tenderStage || "New"} onChange={e => onUpdate({ ...task, tenderStage:e.target.value })} />
                <Input label="REQUESTED DOCUMENTS" disabled={isCompleted} value={task.requestedDocuments || ""} onChange={e => onUpdate({ ...task, requestedDocuments:e.target.value })} placeholder="Tax clearance, RDB, RSSB..." />
                <Input label="MISSING DOCUMENTS" disabled={isCompleted} value={task.missingDocuments || ""} onChange={e => onUpdate({ ...task, missingDocuments:e.target.value })} placeholder="Documents still missing" />
              </div>
            ) : (
              <div style={{ color:C.creamSoft, fontSize:12, lineHeight:1.5, background:C.bg, border:"1px solid "+C.border, borderRadius:8, padding:10 }}>
                Normal MOPAS Task: use this for search and log new tenders, follow-ups, reports, calls, document organization, and company operations. Tender stage fields are hidden because this is not an active tender package.
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:C.gold, letterSpacing:2, marginBottom:4 }}>FOLDER / LIST</div>
        <div style={{ color:C.cream, fontSize:13 }}>{task.folder} / {task.list}</div>
      </div>

      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:11, color:C.gold, letterSpacing:2, marginBottom:4 }}>GOAL</div>
        <div style={{ color:C.cream, fontSize:13 }}>{task.goal}</div>
      </div>

      {task.details && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:11, color:C.gold, letterSpacing:2, marginBottom:4 }}>DETAILS</div>
          <div style={{ color:C.creamSoft, fontSize:13, lineHeight:1.6 }}>{task.details}</div>
        </div>
      )}

      <div style={{ marginBottom:20 }}>
        <div style={{ fontSize:11, color:C.gold, letterSpacing:2, marginBottom:6 }}>{"CHECKLIST ("+done+"/"+items.length+")"}</div>
        <div style={{ height:4, borderRadius:2, background:C.bg, marginBottom:10 }}>
          <div style={{ height:4, borderRadius:2, background:C.green, width: items.length ? (done/items.length*100)+"%" : "0%", transition:"width .3s" }} />
        </div>
        {items.map((c, i) => (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 0", borderBottom:"1px solid "+C.border }}>
            <span onClick={() => toggleCheck(i)} style={{ cursor:isCompleted ? "not-allowed" : "pointer", fontSize:16, width:20, flexShrink:0 }}>{c.done ? "\u2705" : "\u2B1C"}</span>
            <span style={{ flex:1, color: c.done ? C.muted : C.cream, textDecoration: c.done ? "line-through" : "none", fontSize:13, minWidth:0 }}>{c.text}</span>
            <span onClick={() => removeCheck(i)} style={{ cursor:isCompleted ? "not-allowed" : "pointer", color:isCompleted ? C.muted : C.red, fontSize:14, padding:"0 4px", flexShrink:0 }}>{"\u2715"}</span>
          </div>
        ))}
        <div style={{ display:"flex", gap:8, marginTop:10 }}>
          <input disabled={isCompleted} value={newItem} onChange={e => setNewItem(e.target.value)} placeholder={isCompleted ? "Completed task is locked. Reopen to edit." : "Add checklist item..."} onKeyDown={e => e.key === "Enter" && addCheck()}
            style={{ flex:1, padding:"6px 10px", borderRadius:6, border:"1px solid "+C.border, background:C.bg, color:C.cream, fontSize:13, outline:"none", minWidth:0, boxSizing:"border-box" }} />
          <Btn small disabled={isCompleted} onClick={addCheck}>Add</Btn>
        </div>
      </div>

      <div>
        <div style={{ fontSize:11, color:C.gold, letterSpacing:2, marginBottom:8 }}>{"COMMENTS ("+comments.length+")"}</div>
        {comments.map((c, i) => (
          <div key={i} style={{ background:C.bg, borderRadius:8, padding:"10px 12px", marginBottom:8, border:"1px solid "+C.border }}>
            <div style={{ fontSize:12, color:C.cream, lineHeight:1.5 }}>{c.text}</div>
            <div style={{ fontSize:10, color:C.muted, marginTop:4 }}>{c.time}</div>
          </div>
        ))}
        <textarea
          value={newComment}
          disabled={isCompleted}
          onChange={e => setNewComment(e.target.value)}
          placeholder={isCompleted ? "Completed task is locked. Reopen to edit." : "Write a comment..."}
          rows={2}
          style={{ width:"100%", padding:"8px 10px", borderRadius:6, border:"1px solid "+C.border, background:C.bg, color:C.cream, fontSize:13, outline:"none", resize:"vertical", boxSizing:"border-box", fontFamily:"inherit", marginTop:4 }}
        />
        <Btn small disabled={isCompleted} onClick={addComment} style={{ marginTop:6 }}>Add Comment</Btn>
      </div>
    </div>
  );
}


function EndDayReviewModal({ tasks, onClose, onSaveReview, onMoveNormalToTomorrow, onGenerateTomorrowRoutines }) {
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const todayKey = localTodayISO();
  const tomorrowKey = addDaysISO(todayKey, 1);

  const reviewData = useMemo(() => {
    const todayTasks = tasks.filter(t => isDateKey(t.due) && t.due === todayKey);
    const completedToday = todayTasks.filter(isTaskDone);
    const unfinishedRoutine = todayTasks.filter(t => t.isRoutine && isTaskOpen(t));
    const unfinishedNormal = todayTasks.filter(t => !t.isRoutine && isTaskOpen(t));
    const urgentOpen = tasks.filter(t => isTaskOpen(t) && t.priority === "Urgent");
    const overdueOpen = tasks.filter(t => {
      if (!isTaskOpen(t) || !isDateKey(t.due)) return false;
      return t.due < todayKey;
    }).sort((a, b) => String(a.due || "").localeCompare(String(b.due || "")) || String(a.time || "").localeCompare(String(b.time || "")));
    const tomorrowRoutineTasks = tasks.filter(t => t.isRoutine && t.routineDate === tomorrowKey);
    const recommended = uniqueById([
      ...overdueOpen,
      ...urgentOpen,
      ...unfinishedNormal,
      ...tasks.filter(t => isTaskOpen(t) && isDateKey(t.due) && t.due === tomorrowKey),
    ]).slice(0, 7);
    return {
      todayTasks,
      completedToday,
      unfinishedRoutine,
      unfinishedNormal,
      urgentOpen,
      overdueOpen,
      tomorrowRoutineTasks,
      recommended,
    };
  }, [tasks, todayKey, tomorrowKey]);

  const saveReview = () => {
    onSaveReview({
      date: todayKey,
      completedTaskCount: reviewData.completedToday.length,
      missedRoutineTaskCount: reviewData.unfinishedRoutine.length,
      unfinishedNormalTaskCount: reviewData.unfinishedNormal.length,
      urgentOpenCount: reviewData.urgentOpen.length,
      overdueOpenCount: reviewData.overdueOpen.length,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    });
    setMessage("Daily review saved successfully.");
  };
  const moveNormalTasks = () => {
    onMoveNormalToTomorrow();
    setMessage("Unfinished normal tasks due today were moved to tomorrow. Routine tasks stayed as today's record.");
  };
  const generateTomorrowRoutine = () => {
    onGenerateTomorrowRoutines();
    setMessage("Tomorrow routine tasks are ready. Existing routine tasks were not duplicated.");
  };

  const SummaryCard = ({ label, value, color, sub }) => (
    <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:12 }}>
      <div style={{ color:C.creamSoft, fontSize:10, letterSpacing:1.2, textTransform:"uppercase" }}>{label}</div>
      <div style={{ color, fontWeight:900, fontSize:24, marginTop:4 }}>{value}</div>
      {sub && <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>{sub}</div>}
    </div>
  );

  const TaskMini = ({ task }) => (
    <div style={{ background:C.bg, border:"1px solid "+C.border, borderLeft:"4px solid "+priorityColor(task.priority), borderRadius:10, padding:10 }}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start" }}>
        <div style={{ minWidth:0 }}>
          <div style={{ color:C.cream, fontSize:13, fontWeight:800, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{task.title}</div>
          <div style={{ color:C.muted, fontSize:11, marginTop:3 }}>{task.folder || "General"} · {task.due || "No due"}{task.time ? " · " + task.time : ""}</div>
        </div>
        <Badge color={statusColor(task.status)}>{task.status}</Badge>
      </div>
      <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
        <Badge color={priorityColor(task.priority)}>{task.priority}</Badge>
        {task.isRoutine && <Badge color={C.gold}>Routine</Badge>}
      </div>
    </div>
  );

  const ListBlock = ({ title, list, color, empty }) => (
    <div style={{ minWidth:0 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <div style={{ color, fontSize:12, fontWeight:900 }}>{title}</div>
        <Badge color={color}>{list.length}</Badge>
      </div>
      <div style={{ display:"grid", gap:8, maxHeight:260, overflowY:"auto", paddingRight:4 }}>
        {!list.length ? <div style={{ color:C.muted, fontSize:12, textAlign:"center", padding:18, background:C.bg, border:"1px dashed "+C.border, borderRadius:10 }}>{empty}</div> : list.map(task => <TaskMini key={task.id} task={task} />)}
      </div>
    </div>
  );

  return (
    <div style={{ position:"fixed", inset:0, background:"#000b", zIndex:120, display:"flex", alignItems:"center", justifyContent:"center", padding:18 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:C.surface, border:"1px solid "+C.border, borderRadius:18, width:1100, maxWidth:"96vw", maxHeight:"92vh", overflowY:"auto", padding:24, boxShadow:"0 24px 80px #0008" }}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"flex-start", marginBottom:16, flexWrap:"wrap" }}>
          <div>
            <div style={{ color:C.gold, fontSize:11, letterSpacing:2 }}>END DAY REVIEW</div>
            <h2 style={{ color:C.cream, margin:"4px 0 4px", fontSize:24 }}>Daily close-out for {todayKey}</h2>
            <div style={{ color:C.creamSoft, fontSize:13 }}>Save the day, protect routine history, and prepare tomorrow without resetting your workspace.</div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <Btn ghost onClick={onClose}>Close</Btn>
            <Btn orange onClick={saveReview}>Save Daily Review</Btn>
          </div>
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))", gap:10, marginBottom:16 }}>
          <SummaryCard label="Completed today" value={reviewData.completedToday.length} color={C.green} sub="Done tasks" />
          <SummaryCard label="Missed routines" value={reviewData.unfinishedRoutine.length} color={reviewData.unfinishedRoutine.length ? C.red : C.green} sub="Still open today" />
          <SummaryCard label="Normal unfinished" value={reviewData.unfinishedNormal.length} color={reviewData.unfinishedNormal.length ? C.orange : C.green} sub="Can move tomorrow" />
          <SummaryCard label="Urgent open" value={reviewData.urgentOpen.length} color={reviewData.urgentOpen.length ? C.red : C.green} sub="All workspace" />
          <SummaryCard label="Overdue open" value={reviewData.overdueOpen.length} color={reviewData.overdueOpen.length ? C.red : C.green} sub="Before today" />
          <SummaryCard label="Tomorrow routine" value={`${reviewData.tomorrowRoutineTasks.length}/${DAILY_ROUTINES.length}`} color={reviewData.tomorrowRoutineTasks.length >= DAILY_ROUTINES.length ? C.green : C.gold} sub={tomorrowKey} />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(260px, 1fr))", gap:14, marginBottom:16 }}>
          <ListBlock title="Today's completed tasks" list={reviewData.completedToday} color={C.green} empty="No completed task recorded for today yet." />
          <ListBlock title="Unfinished routine tasks" list={reviewData.unfinishedRoutine} color={C.red} empty="All routine tasks are completed today." />
          <ListBlock title="Unfinished normal tasks" list={reviewData.unfinishedNormal} color={C.orange} empty="No unfinished normal task due today." />
          <ListBlock title="Urgent tasks still open" list={reviewData.urgentOpen} color={C.red} empty="No urgent open task." />
          <ListBlock title="Overdue tasks still open" list={reviewData.overdueOpen} color={C.red} empty="No overdue open task." />
          <ListBlock title="Tomorrow recommended focus" list={reviewData.recommended} color={C.blue} empty="Tomorrow is clear. Prepare creative growth or MOPAS follow-up." />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"minmax(0, 1fr) 300px", gap:14, alignItems:"start" }}>
          <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, padding:14 }}>
            <Textarea label="REVIEW NOTES" value={notes} onChange={e => setNotes(e.target.value)} placeholder="What worked today? What was missed? What is tomorrow's main focus?" rows={5} />
            {message && <div style={{ color:C.green, fontSize:12, marginTop:4 }}>{message}</div>}
          </div>
          <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, padding:14 }}>
            <div style={{ color:C.gold, fontSize:11, letterSpacing:2, marginBottom:10 }}>ACTIONS</div>
            <div style={{ display:"grid", gap:8 }}>
              <Btn orange onClick={saveReview}>Save Daily Review</Btn>
              <Btn ghost onClick={moveNormalTasks} disabled={!reviewData.unfinishedNormal.length}>Move unfinished normal tasks to tomorrow</Btn>
              <Btn ghost onClick={generateTomorrowRoutine}>Generate tomorrow routine tasks</Btn>
            </div>
            <div style={{ color:C.creamSoft, fontSize:11, lineHeight:1.5, marginTop:12 }}>
              Routine tasks are not deleted or moved. If unfinished, they remain as today's record and will become overdue.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard({ tasks, activeSpace, settings, goSpace, setView, setActiveSpace, setSelected, setShowNewTask, setShowEndDayReview, onUpdate }) {
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [showWeeklyProgress, setShowWeeklyProgress] = useState(false);
  const [showSpaceHealth, setShowSpaceHealth] = useState(false);
  const [taskCategoryView, setTaskCategoryView] = useState("late");
  const [commandCenterExpanded, setCommandCenterExpanded] = useState(false);
  const [moneyEntries, setMoneyEntries] = useState(() => readStore(MONEY_ENTRIES_KEY, []));
  const [purchaseGoals, setPurchaseGoals] = useState(() => readStore(PURCHASE_GOALS_KEY, DEFAULT_PURCHASE_GOALS));
  const [futureGoals, setFutureGoals] = useState(() => readStore(FUTURE_GOALS_KEY, DEFAULT_FUTURE_GOALS));
  const [moneyForm, setMoneyForm] = useState({ type:"expense", amount:"", category:"", note:"" });
  const [purchaseForm, setPurchaseForm] = useState({ title:"", targetAmount:"", savedAmount:"", priority:"High", deadline:"", note:"" });
  const [futureForm, setFutureForm] = useState({ title:"", targetAmount:"", savedAmount:"", deadline:"", category:"Life Goal", note:"" });

  useEffect(() => { writeStore(MONEY_ENTRIES_KEY, moneyEntries); }, [moneyEntries]);
  useEffect(() => { writeStore(PURCHASE_GOALS_KEY, purchaseGoals); }, [purchaseGoals]);
  useEffect(() => { writeStore(FUTURE_GOALS_KEY, futureGoals); }, [futureGoals]);

  const fmtDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const safeDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "";
  const parseDate = (value) => {
    const key = safeDate(value);
    if (!key) return null;
    const [y, m, d] = key.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const dayDiff = (value, baseDate) => {
    const d = parseDate(value);
    if (!d) return null;
    return Math.round((d - baseDate) / 86400000);
  };
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const todayKey = fmtDate(todayStart);
  const tomorrowKey = addDaysISO(todayKey, 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - todayStart.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const monthStartKey = `${todayStart.getFullYear()}-${String(todayStart.getMonth() + 1).padStart(2, "0")}`;
  const spaceName = (id) => (SPACES.find(s => s.id === id)?.name || id || "Unknown Space");
  const spaceColor = (id) => (SPACES.find(s => s.id === id)?.color || C.orange);
  const mergedSettings = mergeAppSettings(settings || {});
  const commandCenterSettings = mergedSettings.commandCenter || DEFAULT_APP_SETTINGS.commandCenter;
  const commandSectionLabels = COMMAND_CENTER_SECTIONS.reduce((acc, item) => ({ ...acc, [item.key]:item.label }), {});
  const commandVisibleOrder = (commandCenterSettings.sectionOrder || DEFAULT_COMMAND_CENTER_ORDER).filter(key => commandCenterSettings.sections?.[key] !== false);
  const commandDisplayLimit = Math.max(1, Number(commandCenterSettings.visibleCount || 6));
  const commandShownKeys = commandCenterExpanded ? commandVisibleOrder : commandVisibleOrder.slice(0, commandDisplayLimit);
  const commandVisible = (key) => commandShownKeys.includes(key);
  const commandOrder = (key) => { const idx = commandVisibleOrder.indexOf(key); return idx < 0 ? 999 : idx; };
  const commandGridMin = commandCenterSettings.layout === "compact" ? 260 : commandCenterSettings.layout === "wide" ? 380 : 320;
  const commandCardGap = commandCenterSettings.density === "compact" ? 10 : 16;
  const visibleSectionCount = commandVisibleOrder.length;
  const enabledSectionCount = Object.values(commandCenterSettings.sections || {}).filter(Boolean).length;

  useEffect(() => {
    setCommandCenterExpanded(!!commandCenterSettings.defaultExpanded);
  }, [commandCenterSettings.defaultExpanded]);

  const documents = Array.isArray(readStore(DOCUMENTS_KEY, [])) ? readStore(DOCUMENTS_KEY, []) : [];
  const documentWarningDays = Number(settings?.documents?.expiryWarningDays || 30);
  const documentAlerts = useMemo(() => {
    const docsWithStatus = documents.map(doc => ({ ...doc, statusInfo:getDocumentStatus(doc, documentWarningDays) }));
    const expired = docsWithStatus.filter(doc => doc.statusInfo.label === "Expired").sort((a, b) => String(a.expiryDate || "").localeCompare(String(b.expiryDate || "")));
    const expiringSoon = docsWithStatus.filter(doc => doc.statusInfo.label === "Expiring Soon").sort((a, b) => String(a.expiryDate || "").localeCompare(String(b.expiryDate || "")));
    return { expired, expiringSoon, docsWithStatus };
  }, [documents, documentWarningDays]);

  const dashboardData = useMemo(() => {
    const withDue = tasks.filter(t => safeDate(t.due));
    const open = tasks.filter(t => t.status !== "Done");
    const overdue = open.filter(t => {
      const diff = dayDiff(t.due, todayStart);
      return diff !== null && diff < 0;
    }).sort((a, b) => String(a.due || "").localeCompare(String(b.due || "")) || String(a.time || "").localeCompare(String(b.time || "")));
    const dueToday = open.filter(t => safeDate(t.due) === todayKey).sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")) || String(a.title || "").localeCompare(String(b.title || "")));
    const next7 = open.filter(t => {
      const diff = dayDiff(t.due, todayStart);
      return diff !== null && diff > 0 && diff <= 7;
    }).sort((a, b) => String(a.due || "").localeCompare(String(b.due || "")) || String(a.time || "").localeCompare(String(b.time || "")));
    const thisMonth = open.filter(t => safeDate(t.due).startsWith(monthStartKey)).sort((a, b) => String(a.due || "").localeCompare(String(b.due || "")) || String(a.time || "").localeCompare(String(b.time || "")));
    const dueThisWeek = withDue.filter(t => {
      const d = parseDate(t.due);
      return d && d >= weekStart && d <= weekEnd;
    });
    const doneThisWeek = tasks.filter(t => t.status === "Done" && parseDate(t.due) && parseDate(t.due) >= weekStart && parseDate(t.due) <= weekEnd);
    const urgentOpen = open.filter(t => t.priority === "Urgent");
    const priorityScore = (t) => {
      const diff = dayDiff(t.due, todayStart);
      const dueScore = diff === null ? 30 : diff < 0 ? 0 : diff;
      const priority = t.priority === "Urgent" ? 0 : t.priority === "High" ? 1 : t.priority === "Normal" ? 2 : 3;
      const status = t.status === "Blocked" ? 0 : t.status === "In Progress" ? 1 : 2;
      return dueScore * 10 + priority * 3 + status;
    };
    const todayFocus = [...open]
      .filter(t => t.priority === "Urgent" || t.priority === "High" || safeDate(t.due))
      .sort((a, b) => priorityScore(a) - priorityScore(b) || String(a.title || "").localeCompare(String(b.title || "")))
      .slice(0, 5);
    const mopas = tasks.filter(t => t.space === "mopas");
    const mopasOpen = mopas.filter(t => t.status !== "Done");
    const mopasUrgent = mopasOpen
      .filter(t => t.priority === "Urgent" || t.priority === "High" || safeDate(t.due) === todayKey)
      .sort((a, b) => priorityScore(a) - priorityScore(b) || String(a.title || "").localeCompare(String(b.title || "")))
      .slice(0, 6);
    const mopasThisWeek = mopasOpen.filter(t => {
      const d = parseDate(t.due);
      return d && d >= weekStart && d <= weekEnd;
    });
    const weeklyDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const key = fmtDate(d);
      const due = tasks.filter(t => safeDate(t.due) === key);
      const complete = due.filter(t => t.status === "Done");
      return { key, label: d.toLocaleDateString(undefined, { weekday:"short" }), due: due.length, done: complete.length };
    });
    return { overdue, dueToday, next7, thisMonth, dueThisWeek, doneThisWeek, urgentOpen, todayFocus, mopas, mopasOpen, mopasUrgent, mopasThisWeek, weeklyDays };
  }, [tasks, todayKey, monthStartKey]);

  const total = tasks.length;
  const activeTaskCount = tasks.filter(t => t.status !== "Done").length;
  const done = tasks.filter(t => t.status === "Done").length;
  const completionPct = total ? Math.round((done / total) * 100) : 0;
  const weekPct = dashboardData.dueThisWeek.length ? Math.round((dashboardData.doneThisWeek.length / dashboardData.dueThisWeek.length) * 100) : 0;
  const todayRoutineTasks = tasks.filter(t => t.isRoutine && t.routineDate === todayKey);
  const completedRoutineKeys = new Set(todayRoutineTasks.filter(t => t.status === "Done").map(t => t.routineKey));
  const unfinishedRoutineTasks = todayRoutineTasks.filter(t => t.status !== "Done");
  const routinePct = DAILY_ROUTINES.length ? Math.round((completedRoutineKeys.size / DAILY_ROUTINES.length) * 100) : 0;
  const tomorrowRoutineKeys = new Set(tasks.filter(t => t.isRoutine && t.routineDate === tomorrowKey).map(t => t.routineKey));
  const tomorrowReady = tomorrowRoutineKeys.size >= DAILY_ROUTINES.length;

  const openTask = (task) => {
    if (!task) return;
    setActiveSpace(task.space);
    setSelected(task);
    setView("list");
  };
  const goView = (space, viewName) => {
    if (space) setActiveSpace(space);
    setSelected(null);
    setView(viewName);
  };
  const dueTone = (task) => {
    if (task.status === "Done") return { label:"Done", color:C.green };
    const diff = dayDiff(task.due, todayStart);
    if (diff === null) return { label:"No due", color:C.muted };
    if (diff < 0) return { label:"Overdue", color:C.red };
    if (diff === 0) return { label:"Today", color:C.orange };
    return { label: diff === 1 ? "Tomorrow" : `${diff} days`, color:C.blue };
  };
  const timeToMinutes = (time) => {
    const [h, m] = String(time || "00:00").split(":").map(Number);
    return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0);
  };
  const formatMinutes = (minutes) => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

  const scheduleBlocks = [
    { start:"06:00", end:"06:10", period:"Morning", title:"Wake up, drink water, make bed", routineKey:"wake-up" },
    { start:"06:10", end:"06:50", period:"Morning", title:"Read 20 pages", routineKey:"read-20-pages" },
    { start:"06:50", end:"07:20", period:"Morning", title:"Morning workout / mobility", routineKey:"morning-workout" },
    { start:"07:20", end:"08:15", period:"Morning", title:"Breakfast, shower, prepare" },
    { start:"08:15", end:"08:35", period:"Morning", title:"Plan the day and choose top 3 tasks", routineKey:"plan-top-3" },
    { start:"08:45", end:"17:00", period:"Workday", title:"MOPAS work: tenders, follow-up, operations", routineKey:"search-mopas-tenders" },
    { start:"17:00", end:"18:00", period:"Workday", title:"Admin follow-up / messages / tomorrow preparation" },
    { start:"18:30", end:"19:15", period:"Evening", title:"Run, workout, or recovery", routineKey:"evening-health-training" },
    { start:"20:00", end:"21:00", period:"Evening", title:"DrawingBox study", routineKey:"drawingbox-study" },
    { start:"21:00", end:"22:00", period:"Night", title:"43 Project / creative study", routineKey:"43-project-creative-study" },
    { start:"22:00", end:"22:45", period:"Night", title:"AFTERGLOW brand work or portfolio", routineKey:"afterglow-brand-work" },
    { start:"22:45", end:"23:00", period:"Night", title:"End Day Review + money/savings review", routineKey:"end-day-review" },
    { start:"23:00", end:"23:59", period:"Night", title:"Sleep" },
  ].map(block => ({ ...block, startMin:timeToMinutes(block.start), endMin:timeToMinutes(block.end) }));

  const nowMinutes = today.getHours() * 60 + today.getMinutes();
  const dayStarted = nowMinutes >= timeToMinutes("06:00");
  const dayComplete = nowMinutes >= timeToMinutes("23:00");
  const currentBlock = !dayComplete ? scheduleBlocks.find(block => nowMinutes >= block.startMin && nowMinutes < block.endMin) : null;
  const nextBlock = dayComplete ? null : scheduleBlocks.find(block => block.startMin > nowMinutes);
  const completedBlocks = scheduleBlocks.filter(block => nowMinutes >= block.endMin && block.start !== "23:00");
  const remainingBlocks = scheduleBlocks.filter(block => block.startMin > nowMinutes && block.start !== "23:00");

  const scheduleStatus = (block) => {
    if (dayComplete) return block.start === "23:00" ? { label:"Current", color:C.green } : { label:"Completed time", color:C.green };
    if (nowMinutes >= block.startMin && nowMinutes < block.endMin) return { label:"Current", color:C.orange };
    if (nowMinutes >= block.endMin) return { label:"Completed time", color:C.green };
    return { label:"Upcoming", color:C.blue };
  };
  const routineTaskForBlock = (block) => block.routineKey ? todayRoutineTasks.find(t => t.routineKey === block.routineKey) : null;

  const sectionTitle = (label, sub, right) => (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10, marginBottom:12, flexWrap:"wrap" }}>
      <div>
        <div style={{ color:C.gold, fontSize:11, letterSpacing:2 }}>{label}</div>
        {sub && <div style={{ color:C.creamSoft, fontSize:12, marginTop:3 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );

  const Empty = ({ text }) => <div style={{ color:C.muted, fontSize:12, textAlign:"center", padding:"18px 10px", background:C.bg, border:"1px dashed "+C.border, borderRadius:10 }}>{text}</div>;

  const ProgressBar = ({ value, color, height = 5 }) => (
    <div style={{ height, borderRadius:height, background:C.bg, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${Math.max(0, Math.min(100, value || 0))}%`, background:color, borderRadius:height, transition:"width .25s" }} />
    </div>
  );

  const StatCard = ({ label, value, color, sub }) => (
    <div style={{ ...PNL, padding:14, minWidth:0 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
        <div style={{ minWidth:0 }}>
          <div style={{ color:C.creamSoft, fontSize:10, letterSpacing:1.2, textTransform:"uppercase" }}>{label}</div>
          {sub && <div style={{ color:C.muted, fontSize:11, marginTop:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{sub}</div>}
        </div>
        <div style={{ width:8, height:8, borderRadius:"50%", background:color, boxShadow:"0 0 12px "+color+"77", flexShrink:0 }} />
      </div>
      <div style={{ fontSize:28, fontWeight:900, color, marginTop:8, lineHeight:1 }}>{value}</div>
    </div>
  );

  const TaskRow = ({ task, compact }) => {
    const tone = dueTone(task);
    return (
      <div onClick={() => openTask(task)} style={{
        display:"grid",
        gridTemplateColumns: compact ? "minmax(0, 1fr) auto" : "minmax(0, 1fr) auto auto",
        gap:8,
        alignItems:"center",
        padding:compact ? "9px 10px" : "10px 12px",
        background:C.bg,
        border:"1px solid "+C.border,
        borderLeft:"4px solid "+tone.color,
        borderRadius:10,
        cursor:"pointer",
        minWidth:0,
      }}>
        <div style={{ minWidth:0 }}>
          <div style={{ color:C.cream, fontSize:13, fontWeight:700, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{task.title}</div>
          <div style={{ color:C.muted, fontSize:11, marginTop:3, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{spaceName(task.space)} · {task.folder || "General"}{task.time ? " · " + task.time : ""}</div>
          {compact && (
            <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:6 }}>
              <Badge color={statusColor(task.status)}>{task.status}</Badge>
              <Badge color={priorityColor(task.priority)}>{task.priority}</Badge>
              {task.due && <Badge color={C.creamSoft}>{task.due}</Badge>}
            </div>
          )}
        </div>
        {!compact && <Badge color={statusColor(task.status)}>{task.status}</Badge>}
        <Badge color={tone.color}>{tone.label}</Badge>
      </div>
    );
  };

  const ScheduleRow = ({ block }) => {
    const status = scheduleStatus(block);
    const task = routineTaskForBlock(block);
    const done = task && task.status === "Done";
    const isCurrent = status.label === "Current";
    const workTasks = block.period === "Workday" ? sortTasksSmart([
      ...dashboardData.mopasUrgent,
      ...dashboardData.dueToday.filter(t => t.space === "mopas"),
    ]).filter((t, idx, arr) => arr.findIndex(x => x.id === t.id) === idx).slice(0, 4) : [];
    const openTarget = () => {
      if (task) openTask(task);
      else if (workTasks[0]) openTask(workTasks[0]);
      else if (block.period === "Workday") goView("mopas", "list");
    };
    return (
      <div onClick={openTarget} style={{
        display:"grid",
        gridTemplateColumns:"96px minmax(0, 1fr) auto",
        gap:10,
        alignItems:"center",
        padding:"10px 12px",
        background:isCurrent ? C.elevated : C.bg,
        border:"1px solid "+(isCurrent ? C.orange : C.border),
        borderLeft:"4px solid "+(done ? C.green : status.color),
        borderRadius:10,
        cursor:(task || workTasks.length || block.period === "Workday") ? "pointer" : "default",
        boxShadow:isCurrent ? "0 0 0 1px "+C.orange+"33" : "none",
      }}>
        <div style={{ color:isCurrent ? C.orange : C.gold, fontSize:12, fontWeight:900 }}>{block.start}{block.end && block.start !== "23:00" ? " - " + block.end : ""}</div>
        <div style={{ minWidth:0 }}>
          <div style={{ color:C.cream, fontSize:13, fontWeight:800, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{block.title}</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:6 }}>
            <Badge color={block.period === "Morning" ? C.gold : block.period === "Workday" ? C.blue : block.period === "Evening" ? C.green : C.purple}>{block.period}</Badge>
            <Badge color={status.color}>{status.label}</Badge>
            {task && <Badge color={done ? C.green : statusColor(task.status)}>{done ? "Routine done" : task.status}</Badge>}
            {workTasks.length > 0 && <Badge color={C.blue}>{workTasks.length} MOPAS priority</Badge>}
          </div>
          {workTasks.length > 0 && (
            <div style={{ display:"grid", gap:5, marginTop:8 }}>
              {workTasks.map(item => (
                <div key={item.id} style={{ color:C.creamSoft, fontSize:11, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>• {item.title}{item.due ? " · " + item.due : ""}</div>
              ))}
            </div>
          )}
        </div>
        {isCurrent && <div style={{ color:C.orange, fontSize:18, fontWeight:900 }}>•</div>}
      </div>
    );
  };

  const AlertList = ({ title, list, color, emptyText, type }) => (
    <div style={{ minWidth:0 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
        <span style={{ color, fontSize:12, fontWeight:900 }}>{title}</span>
        <Badge color={color}>{list.length}</Badge>
      </div>
      <div style={{ display:"grid", gap:8 }}>
        {!list.length ? <Empty text={emptyText} /> : list.slice(0, 5).map(item => type === "doc" ? (
          <div key={item.id} style={{ background:C.bg, border:"1px solid "+C.border, borderLeft:"4px solid "+color, borderRadius:10, padding:10, minWidth:0 }}>
            <div style={{ color:C.cream, fontSize:13, fontWeight:800, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.title || item.fileName || "Untitled document"}</div>
            <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>{spaceName(item.space)} · Expiry: {item.expiryDate || "No date"}</div>
          </div>
        ) : <TaskRow key={item.id} task={item} compact />)}
      </div>
    </div>
  );

  const WeeklyPanel = () => (
    <div style={{ ...PNL, minWidth:0, borderLeft:"4px solid "+C.green }}>
      {sectionTitle("COLLAPSIBLE WEEKLY PROGRESS", "Based on tasks with due dates in this week.", <Btn small ghost onClick={() => setShowWeeklyProgress(v => !v)}>{showWeeklyProgress ? "Hide" : "Show"}</Btn>)}
      {showWeeklyProgress ? (
        <>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10, marginBottom:14 }}>
            <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:10 }}><div style={{ color:C.green, fontSize:22, fontWeight:900 }}>{dashboardData.doneThisWeek.length}</div><div style={{ color:C.creamSoft, fontSize:11 }}>Completed</div></div>
            <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:10 }}><div style={{ color:C.blue, fontSize:22, fontWeight:900 }}>{dashboardData.dueThisWeek.length}</div><div style={{ color:C.creamSoft, fontSize:11 }}>Due this week</div></div>
            <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:10 }}><div style={{ color:C.orange, fontSize:22, fontWeight:900 }}>{weekPct}%</div><div style={{ color:C.creamSoft, fontSize:11 }}>Completion</div></div>
          </div>
          <ProgressBar value={weekPct} color={weekPct >= 70 ? C.green : weekPct >= 35 ? C.orange : C.red} height={7} />
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7, minmax(36px, 1fr))", gap:6, marginTop:14 }}>
            {dashboardData.weeklyDays.map(d => {
              const height = Math.max(8, Math.min(46, (d.due || 0) * 14));
              return (
                <div key={d.key} title={`${d.key}: ${d.done}/${d.due} done`} style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:8, padding:7, textAlign:"center" }}>
                  <div style={{ height:48, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
                    <div style={{ width:14, height, borderRadius:8, background:d.due ? C.blue : C.border }} />
                  </div>
                  <div style={{ color:C.creamSoft, fontSize:10, marginTop:5 }}>{d.label}</div>
                  <div style={{ color:C.gold, fontSize:10, fontWeight:800 }}>{d.done}/{d.due}</div>
                </div>
              );
            })}
          </div>
        </>
      ) : <div style={{ color:C.creamSoft, fontSize:30 }}>Weekly progress is hidden to keep the dashboard clean.</div>}
    </div>
  );

  const SpaceHealthPanel = () => (
    <div style={{ ...PNL, minWidth:0 }}>
      {sectionTitle("COLLAPSIBLE SPACE HEALTH", "Open work, urgent items, and overdue risk by space.", <Btn small ghost onClick={() => setShowSpaceHealth(v => !v)}>{showSpaceHealth ? "Hide" : "Show"}</Btn>)}
      {showSpaceHealth ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(230px, 1fr))", gap:12 }}>
          {SPACES.map(sp => {
            const st = tasks.filter(t => t.space === sp.id);
            const sd = st.filter(t => t.status === "Done").length;
            const open = st.filter(t => t.status !== "Done");
            const urgentOpen = open.filter(t => t.priority === "Urgent").length;
            const overdue = open.filter(t => {
              const diff = dayDiff(t.due, todayStart);
              return diff !== null && diff < 0;
            }).length;
            const pct = st.length ? Math.round((sd / st.length) * 100) : 0;
            return (
              <div key={sp.id} onClick={() => goSpace(sp.id)} style={{ background:C.bg, border:"1px solid "+C.border, borderLeft:"4px solid "+sp.color, borderRadius:12, padding:12, cursor:"pointer", minWidth:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start" }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ color:C.cream, fontWeight:800, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{sp.name}</div>
                    <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>{open.length} open · {urgentOpen} urgent · {overdue} late</div>
                  </div>
                  <Badge color={sp.color}>{pct}%</Badge>
                </div>
                <ProgressBar value={pct} color={sp.color} height={6} />
              </div>
            );
          })}
        </div>
      ) : <div style={{ color:C.creamSoft, fontSize:12 }}>Space health is hidden. Open it only when you need a broader workspace check.</div>}
    </div>
  );

  const schedulePreviewBlocks = [currentBlock, nextBlock].filter(Boolean);
  const disciplineMessage = dayComplete ? "Day complete. Use End Day Review to close today." : !dayStarted ? "Prepare to start strong at 6:00 AM." : currentBlock ? `Now: ${currentBlock.title}` : nextBlock ? `Next: ${nextBlock.title} at ${nextBlock.start}` : "Use the next open block with discipline.";

  const goalsBySpace = useMemo(() => loadStructuredGoals(), []);
  const goalProgress = useMemo(() => getGoalProgress(tasks, goalsBySpace), [tasks, goalsBySpace]);
  const visibleGoalCards = useMemo(() => Object.entries(goalProgress).flatMap(([space, goals]) => (goals || []).map(goal => ({ ...goal, space }))).sort((a, b) => a.progress - b.progress).slice(0, 6), [goalProgress]);
  const routineStreaks = useMemo(() => DAILY_ROUTINES.map(r => ({ ...r, streak:getRoutineStreak(tasks, r.routineKey, todayKey) })), [tasks, todayKey]);
  const lifePillarData = useMemo(() => LIFE_OS_PILLARS.map(pillar => {
    const pillarTasks = tasks.filter(t => t.space === pillar.space);
    const open = pillarTasks.filter(t => t.status !== "Done").length;
    const doneToday = pillarTasks.filter(t => t.status === "Done" && (t.due === todayKey || t.routineDate === todayKey)).length;
    const routines = pillar.routineKeys.map(key => todayRoutineTasks.find(t => t.routineKey === key)).filter(Boolean);
    const routineDone = routines.filter(t => t.status === "Done").length;
    const scoreBase = routines.length ? routines.length : 1;
    const score = Math.round((routineDone / scoreBase) * 100);
    return { ...pillar, open, doneToday, routineDone, routineTotal:routines.length, score };
  }), [tasks, todayKey, todayRoutineTasks]);

  const first7DayTest = useMemo(() => FIRST_7_DAY_TEST.map(item => {
    const task = todayRoutineTasks.find(t => t.routineKey === item.routineKey);
    return { ...item, task, done:!!task && task.status === "Done" };
  }), [todayRoutineTasks]);

  const lifeSystemScore = first7DayTest.length ? Math.round((first7DayTest.filter(x => x.done).length / first7DayTest.length) * 100) : 0;

  const overdueStrong = dashboardData.overdue.slice().sort((a, b) => {
    const aBoost = a.space === "mopas" ? -50 : 0;
    const bBoost = b.space === "mopas" ? -50 : 0;
    return aBoost - bBoost || compareTaskSmart(a, b);
  });

  const getCoach = () => {
    const firstOverdue = overdueStrong[0];
    if (firstOverdue) {
      const lateDays = Math.abs(daysBetweenLocal(todayKey, firstOverdue.due) || 0);
      return {
        color:firstOverdue.space === "mopas" ? C.red : C.orange,
        task:firstOverdue,
        title:`Focus now: ${firstOverdue.title}`,
        why:firstOverdue.space === "mopas"
          ? `This MOPAS/tender task is ${lateDays} day(s) late and can affect submission or client trust.`
          : `This task is ${lateDays} day(s) late. Clear it before starting new work.`,
        meta:`${spaceName(firstOverdue.space)} · deadline ${firstOverdue.due || "missing"}`,
        action:"Open exact task",
      };
    }
    if (currentBlock && currentBlock.routineKey) {
      const task = routineTaskForBlock(currentBlock);
      if (task && task.status !== "Done") {
        return {
          color:C.orange,
          task,
          title:`Current block: ${currentBlock.title}`,
          why:"This is the discipline block for the current time. Completing it protects your routine streak.",
          meta:`${spaceName(task.space)} · ${currentBlock.start}-${currentBlock.end}`,
          action:"Open routine task",
        };
      }
    }
    if (currentBlock && currentBlock.period === "Workday" && dashboardData.mopasUrgent[0]) {
      const task = dashboardData.mopasUrgent[0];
      return {
        color:C.blue,
        task,
        title:`MOPAS priority: ${task.title}`,
        why:"The workday block is active, so tender/client work should lead your attention.",
        meta:`${spaceName(task.space)} · ${task.due || "no deadline"}`,
        action:"Open MOPAS task",
      };
    }
    const todayTask = dashboardData.dueToday[0];
    if (todayTask) {
      return {
        color:C.gold,
        task:todayTask,
        title:`Due today: ${todayTask.title}`,
        why:"Finish today’s deadline before it turns into tomorrow’s emergency.",
        meta:`${spaceName(todayTask.space)} · today ${todayTask.time || ""}`,
        action:"Open task",
      };
    }
    const weakGoal = visibleGoalCards.find(g => g.progress < 70);
    if (weakGoal) {
      return {
        color:spaceColor(weakGoal.space),
        task:null,
        space:weakGoal.space,
        title:`Build goal progress: ${weakGoal.title}`,
        why:`This goal is at ${weakGoal.progress}%. Link or complete tasks that support it.`,
        meta:`${spaceName(weakGoal.space)} · ${weakGoal.doneCount}/${weakGoal.target} target`,
        action:"Open space",
      };
    }
    if (nextBlock) {
      return {
        color:C.green,
        task: routineTaskForBlock(nextBlock),
        space: routineTaskForBlock(nextBlock)?.space || activeSpace,
        title:`Prepare next: ${nextBlock.title}`,
        why:"You are clear now. Prepare the next block before time arrives.",
        meta:`${nextBlock.period} · starts ${nextBlock.start}`,
        action:routineTaskForBlock(nextBlock) ? "Open next task" : "Open space",
      };
    }
    return {
      color:C.green,
      task:null,
      space:"wakeup",
      title:"Close the day with End Day Review",
      why:"Review today, move normal unfinished work, and prepare tomorrow without deleting history.",
      meta:`Today ${todayKey}`,
      action:"Open review",
    };
  };
  const coach = getCoach();

  const CoachPanel = () => (
    <div style={{ ...PNL, padding:24, background:`linear-gradient(135deg, ${C.elevated}, ${C.surface})`, borderLeft:"5px solid "+coach.color, boxShadow:"0 18px 50px #0005" }}>
      <div style={{ display:"grid", gridTemplateColumns:"minmax(0, 1fr) auto", gap:16, alignItems:"center" }}>
        <div style={{ minWidth:0 }}>
          <div style={{ color:C.gold, fontSize:11, letterSpacing:2, marginBottom:6 }}>MENTAL COACH / DO THIS NOW</div>
          <div style={{ color:C.cream, fontSize:24, fontWeight:900, lineHeight:1.15, marginBottom:8 }}>{coach.title}</div>
          <div style={{ color:C.creamSoft, fontSize:13, lineHeight:1.55, marginBottom:10 }}>{coach.why}</div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <Badge color={coach.color}>{coach.meta}</Badge>
            {currentBlock && <Badge color={C.blue}>Current: {currentBlock.start}-{currentBlock.end}</Badge>}
            {nextBlock && <Badge color={C.creamSoft}>Next: {nextBlock.start}</Badge>}
          </div>
        </div>
        <Btn orange onClick={() => {
          if (coach.task) openTask(coach.task);
          else if (coach.action === "Open review") setShowEndDayReview(true);
          else goView(coach.space || "wakeup", "list");
        }}>{coach.action}</Btn>
      </div>
    </div>
  );

  const CommandCenterControlPanel = () => {
    const hiddenCount = Math.max(0, commandVisibleOrder.length - commandShownKeys.length);
    const shownCount = commandShownKeys.length;
    const openCalendar = () => goView(activeSpace || "wakeup", "calendar");
    return (
      <div style={{ ...PNL, minWidth:0, borderLeft:"5px solid "+C.orange, padding:22, background:`linear-gradient(135deg, ${C.surface}, ${C.elevated})`, boxShadow:"0 16px 45px #0004" }}>
        <div style={{ display:"grid", gridTemplateColumns:"minmax(0, 1fr) auto", gap:14, alignItems:"start" }}>
          <div style={{ minWidth:0 }}>
            <div style={{ color:C.gold, fontSize:11, letterSpacing:2, marginBottom:5 }}>PROFESSIONAL COMMAND CENTER</div>
            <h2 style={{ margin:"0 0 6px", color:C.cream, fontSize:24, lineHeight:1.15 }}>{mergedSettings.appearance.dashboardLabel || "Command Center"}</h2>
            <div style={{ color:C.creamSoft, fontSize:13, lineHeight:1.5 }}>Calendar is preserved. Financial Health now lives inside Money & Savings. Choose sections in Settings, arrange their order, and use Show More when you need the full control board.</div>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end" }}>
            <Btn small ghost onClick={openCalendar}>Open Calendar</Btn>
            <Btn small ghost onClick={() => setView("settings")}>Customize</Btn>
            {hiddenCount > 0 ? <Btn small orange onClick={() => setCommandCenterExpanded(v => !v)}>{commandCenterExpanded ? "Show Less" : `Show More (${hiddenCount})`}</Btn> : <Badge color={C.green}>All shown</Badge>}
          </div>
        </div>
        {commandCenterSettings.showStatusBar !== false && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))", gap:10, marginTop:16 }}>
            {[
              { label:"Visible now", value:shownCount, color:C.orange },
              { label:"Enabled sections", value:enabledSectionCount, color:C.green },
              { label:"Total sections", value:visibleSectionCount, color:C.blue },
              { label:"Layout", value:commandCenterSettings.layout || "balanced", color:C.gold },
            ].map(item => (
              <div key={item.label} style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, padding:10 }}>
                <div style={{ color:item.color, fontSize:20, fontWeight:900, lineHeight:1 }}>{item.value}</div>
                <div style={{ color:C.creamSoft, fontSize:11, marginTop:4 }}>{item.label}</div>
              </div>
            ))}
          </div>
        )}
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginTop:14 }}>
          {commandVisibleOrder.map((key, index) => {
            const active = commandShownKeys.includes(key);
            return (
              <span key={key} style={{ padding:"7px 10px", borderRadius:999, border:"1px solid "+(active ? C.orange : C.border), background:active ? C.orange+"18" : C.bg, color:active ? C.cream : C.muted, fontSize:11, fontWeight:800 }}>
                {commandCenterSettings.showSectionNumbers !== false ? `${index + 1}. ` : ""}{commandSectionLabels[key] || key}
              </span>
            );
          })}
        </div>
      </div>
    );
  };

  const LifeOSUpgradePanel = () => (
    <div style={{ ...PNL, padding:22, borderLeft:"5px solid "+C.gold, background:`linear-gradient(135deg, ${C.surface}, ${C.bg})` }}>
      {sectionTitle("SAMUEL LIFE OS / FINAL UPGRADE", "This is the real upgrade: your morning, MOPAS work, health, drawing, AFTERGLOW, and money are now tracked in one command system.", <Badge color={lifeSystemScore >= 70 ? C.green : lifeSystemScore >= 35 ? C.orange : C.red}>{lifeSystemScore}% today</Badge>)}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:10, marginBottom:14 }}>
        {lifePillarData.map(pillar => (
          <div key={pillar.id} onClick={() => goView(pillar.space, "list")} style={{ background:C.bg, border:"1px solid "+C.border, borderLeft:"4px solid "+spaceColor(pillar.space), borderRadius:12, padding:12, cursor:"pointer", minWidth:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"center", marginBottom:6 }}>
              <div style={{ color:C.cream, fontWeight:900, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{pillar.label}</div>
              <Badge color={spaceColor(pillar.space)}>{pillar.routineDone}/{pillar.routineTotal || 1}</Badge>
            </div>
            <div style={{ color:C.muted, fontSize:11, lineHeight:1.45, minHeight:31 }}>{pillar.target}</div>
            <div style={{ marginTop:9 }}><ProgressBar value={pillar.score} color={spaceColor(pillar.space)} height={6} /></div>
            <div style={{ color:C.creamSoft, fontSize:10, marginTop:6 }}>{pillar.open} open · {pillar.doneToday} done today</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"minmax(0, 1fr) minmax(260px, .7fr)", gap:14, alignItems:"start" }}>
        <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, padding:14 }}>
          <div style={{ color:C.gold, fontSize:11, letterSpacing:2, marginBottom:8 }}>FIRST 7-DAY TEST</div>
          <div style={{ display:"grid", gap:7 }}>
            {first7DayTest.map(item => (
              <div key={item.routineKey} onClick={() => item.task && openTask(item.task)} style={{ display:"grid", gridTemplateColumns:"22px minmax(0, 1fr) auto", gap:8, alignItems:"center", color:item.done ? C.green : C.creamSoft, fontSize:12, cursor:item.task ? "pointer" : "default" }}>
                <span>{item.done ? "✅" : "⬜"}</span>
                <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.label}</span>
                <Badge color={item.done ? C.green : C.muted}>{item.done ? "Done" : "Open"}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const GoalProgressPanel = () => (
    <div style={{ ...PNL, minWidth:0, borderLeft:"4px solid "+C.purple }}>
      {sectionTitle("GOALS LINKED TO TASKS", "Progress updates from completed tasks that match goal/key-result keywords.", <Btn small ghost onClick={() => goView(activeSpace, "Goals")}>Open Goals</Btn>)}
      <div style={{ display:"grid", gap:10 }}>
        {visibleGoalCards.map(goal => (
          <div key={goal.id} style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", gap:8, marginBottom:6 }}>
              <div style={{ minWidth:0 }}>
                <div style={{ color:C.cream, fontWeight:800, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{goal.title}</div>
                <div style={{ color:C.muted, fontSize:11 }}>{spaceName(goal.space)} · {goal.doneCount}/{goal.target} target · {goal.linkedCount} linked tasks</div>
              </div>
              <Badge color={spaceColor(goal.space)}>{goal.progress}%</Badge>
            </div>
            <ProgressBar value={goal.progress} color={spaceColor(goal.space)} height={6} />
          </div>
        ))}
      </div>
    </div>
  );

  const MiniCalendarPanel = () => {
    const [miniDate, setMiniDate] = useState(todayStart);
    const [miniSelected, setMiniSelected] = useState(todayKey);
    const y = miniDate.getFullYear();
    const m = miniDate.getMonth();
    const miniMonthStart = new Date(y, m, 1);
    const first = miniMonthStart.getDay();
    const days = new Date(y, m + 1, 0).getDate();
    const cells = Array.from({ length:Math.ceil((first + days) / 7) * 7 }, (_, i) => {
      const day = i - first + 1;
      return day >= 1 && day <= days ? `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
    });
    const selectedTasks = sortTasksSmart(tasks.filter(t => isDateKey(t.due) && t.due === miniSelected));
    const monthLabel = miniDate.toLocaleDateString(undefined, { month:"long", year:"numeric" });
    const createForDate = () => {
      setShowNewTask(true);
      setActiveSpace(activeSpace);
    };
    return (
      <div style={{ ...PNL, minWidth:0, borderLeft:"4px solid "+C.gold }}>
        {sectionTitle("CALENDAR / MONTH VIEW", "Calendar was not removed. This dashboard calendar gives a fast month view; use Open Full Calendar for the full workspace calendar.", <Badge color={C.gold}>{monthLabel}</Badge>)}
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <Btn small ghost onClick={() => setMiniDate(new Date(y, m - 1, 1))}>Prev</Btn>
          <Btn small ghost onClick={() => { setMiniDate(todayStart); setMiniSelected(todayKey); }}>Today</Btn>
          <Btn small ghost onClick={() => setMiniDate(new Date(y, m + 1, 1))}>Next</Btn>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7, 1fr)", gap:4, marginBottom:8 }}>
          {["S","M","T","W","T","F","S"].map((d, i) => <div key={d+i} style={{ color:C.muted, fontSize:10, textAlign:"center" }}>{d}</div>)}
          {cells.map((key, i) => {
            const dayTasks = key ? tasks.filter(t => isDateKey(t.due) && t.due === key) : [];
            const overdue = key && key < todayKey && dayTasks.some(t => t.status !== "Done");
            const isToday = key === todayKey;
            const selected = key === miniSelected;
            return (
              <div key={i} onClick={() => key && setMiniSelected(key)} style={{
                minHeight:34, borderRadius:8, border:"1px solid "+(selected ? C.orange : overdue ? C.red : isToday ? C.gold : C.border),
                background:key ? (selected ? C.elevated : C.bg) : "transparent", cursor:key ? "pointer" : "default",
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:3,
              }}>
                <div style={{ color:isToday ? C.gold : key ? C.creamSoft : C.border, fontSize:11, fontWeight:selected ? 900 : 600 }}>{key ? Number(key.slice(-2)) : ""}</div>
                {dayTasks.length > 0 && <div style={{ display:"flex", gap:2 }}>
                  {dayTasks.slice(0,3).map((t, idx) => <span key={idx} style={{ width:5, height:5, borderRadius:"50%", background:t.status === "Done" ? C.green : overdue ? C.red : priorityColor(t.priority) }} />)}
                </div>}
              </div>
            );
          })}
        </div>
        <div style={{ color:C.creamSoft, fontSize:12, margin:"10px 0 8px" }}>{miniSelected} · {selectedTasks.length} task(s)</div>
        <div style={{ display:"grid", gap:7, maxHeight:220, overflowY:"auto" }}>
          {selectedTasks.length ? selectedTasks.slice(0, 5).map(task => <TaskRow key={task.id} task={task} compact />) : <Empty text="No task on this date." />}
        </div>
        <div style={{ display:"grid", gap:8, marginTop:10 }}>
          <Btn orange onClick={createForDate}>+ Create task for selected date</Btn>
          <Btn ghost onClick={() => goView(activeSpace || "wakeup", "calendar")}>Open Full Calendar</Btn>
          <Btn ghost onClick={() => setShowEndDayReview(true)}>End Day Review</Btn>
          <Btn ghost onClick={() => goView("mopas", "daily report")}>Daily Report</Btn>
        </div>
      </div>
    );
  };

  const LateTasksPanel = () => (
    <div style={{ ...PNL, minWidth:0, borderLeft:"5px solid "+(overdueStrong.length ? C.red : C.green) }}>
      {sectionTitle("LATE / OVERDUE TASKS", "Late work stays visible until it is done.", <Badge color={overdueStrong.length ? C.red : C.green}>{overdueStrong.length} late</Badge>)}
      <div style={{ display:"grid", gap:8 }}>
        {!overdueStrong.length ? <Empty text="No overdue task. Keep the day clean." /> : overdueStrong.slice(0, 8).map(task => {
          const lateDays = Math.abs(daysBetweenLocal(todayKey, task.due) || 0);
          return (
            <div key={task.id} style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) auto", gap:10, alignItems:"center", background:C.bg, border:"1px solid "+C.border, borderLeft:"5px solid "+(task.space === "mopas" ? C.red : C.orange), borderRadius:10, padding:10 }}>
              <div style={{ minWidth:0 }}>
                <div style={{ color:C.cream, fontSize:13, fontWeight:900, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{task.title}</div>
                <div style={{ color:C.muted, fontSize:11, marginTop:3 }}>{spaceName(task.space)} · deadline {task.due} · {lateDays} day(s) late</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:7 }}>
                  <Badge color={priorityColor(task.priority)}>{task.priority}</Badge>
                  <Badge color={task.space === "mopas" ? C.red : C.orange}>{task.space === "mopas" ? "MOPAS urgency" : "Personal overdue"}</Badge>
                </div>
              </div>
              <Btn small orange onClick={() => openTask(task)}>Open</Btn>
            </div>
          );
        })}
      </div>
    </div>
  );

  const taskGroups = useMemo(() => {
    const openTasks = tasks.filter(t => t.status !== "Done");
    const inProgress = sortTasksSmart(openTasks.filter(t => t.status === "In Progress"));
    const late = sortTasksSmart(openTasks.filter(isLateTask));
    const undone = sortTasksSmart(openTasks.filter(t => !isDateKey(t.due) && t.status !== "In Progress" && t.status !== "Blocked"));
    const active = sortTasksSmart(openTasks.filter(t => t.status === "To Do" && !isLateTask(t) && isDateKey(t.due)));
    const completed = sortTasksSmart(tasks.filter(t => t.status === "Done"));
    return { active, inProgress, late, undone, completed };
  }, [tasks]);

  const moneyStats = useMemo(() => {
    const entries = Array.isArray(moneyEntries) ? moneyEntries : [];
    const week = getWeekRangeKeys(todayStart);
    const byDate = entries.filter(e => e.date === todayKey);
    const inWeek = entries.filter(e => e.date >= week.start && e.date <= week.end);
    const inMonth = entries.filter(e => String(e.date || "").startsWith(monthStartKey));
    const sum = (items, type) => items.filter(e => e.type === type).reduce((total, e) => total + numberValue(e.amount), 0);
    const todayIncome = sum(byDate, "income");
    const todayExpense = sum(byDate, "expense");
    const todaySavings = sum(byDate, "savings");
    const weeklySavings = sum(inWeek, "savings");
    const monthlySavings = sum(inMonth, "savings");
    const itsindaThisWeek = inWeek.filter(e => String(e.category || "").toLowerCase().includes("itsinda")).reduce((total, e) => total + numberValue(e.amount), 0);
    const itsindaPaid = itsindaThisWeek >= ITSINDA_WEEKLY_AMOUNT || tasks.some(t => t.routineKey === "itsinda-weekly-savings" && t.routineDate >= week.start && t.routineDate <= week.end && t.status === "Done");
    return { todayIncome, todayExpense, todaySavings, todayNet:todayIncome - todayExpense, weeklySavings, monthlySavings, itsindaThisWeek, itsindaPaid };
  }, [moneyEntries, tasks, todayKey, todayStart, monthStartKey]);

  const addMoneyEntry = (type = moneyForm.type) => {
    const amount = numberValue(moneyForm.amount);
    if (!amount) return;
    const entry = { id:"ME-" + Date.now(), date:todayKey, type, amount, category:moneyForm.category || (type === "savings" ? "Savings" : type === "income" ? "Income" : "Expense"), note:moneyForm.note || "" };
    setMoneyEntries(prev => [entry, ...(Array.isArray(prev) ? prev : [])]);
    setMoneyForm({ type:"expense", amount:"", category:"", note:"" });
  };

  const markItsindaPaid = () => {
    const entry = { id:"ME-ITSINDA-" + Date.now(), date:todayKey, type:"savings", amount:ITSINDA_WEEKLY_AMOUNT, category:"ITSINDA", note:"Weekly ITSINDA contribution" };
    setMoneyEntries(prev => [entry, ...(Array.isArray(prev) ? prev : [])]);
    const fridayTask = tasks.find(t => t.routineKey === "itsinda-weekly-savings" && t.routineDate === todayKey);
    if (fridayTask && typeof onUpdate === "function") onUpdate({ ...fridayTask, status:"Done", completedAt:new Date().toISOString(), locked:true });
    else if (fridayTask) openTask(fridayTask);
  };

  const addPurchaseGoal = () => {
    if (!String(purchaseForm.title || "").trim()) return;
    setPurchaseGoals(prev => [{ id:"PG-" + Date.now(), ...purchaseForm, targetAmount:numberValue(purchaseForm.targetAmount), savedAmount:numberValue(purchaseForm.savedAmount) }, ...(Array.isArray(prev) ? prev : [])]);
    setPurchaseForm({ title:"", targetAmount:"", savedAmount:"", priority:"High", deadline:"", note:"" });
  };
  const addFutureGoal = () => {
    if (!String(futureForm.title || "").trim()) return;
    setFutureGoals(prev => [{ id:"FG-" + Date.now(), ...futureForm, targetAmount:numberValue(futureForm.targetAmount), savedAmount:numberValue(futureForm.savedAmount) }, ...(Array.isArray(prev) ? prev : [])]);
    setFutureForm({ title:"", targetAmount:"", savedAmount:"", deadline:"", category:futureForm.category || "Life Goal", note:"" });
  };

  const TaskCategoryPanel = () => {
    const categories = [
      { key:"active", title:"ACTIVE TASKS", list:taskGroups.active, color:C.blue, sub:"Due today or future, not started" },
      { key:"progress", title:"IN PROGRESS", list:taskGroups.inProgress, color:C.orange, sub:"Started but not finished" },
      { key:"late", title:"LATE TASKS", list:taskGroups.late, color:C.red, sub:"Deadline passed" },
      { key:"undone", title:"UNDONE TASKS", list:taskGroups.undone, color:C.gold, sub:"No deadline but still open" },
      { key:"completed", title:"COMPLETED TASKS", list:taskGroups.completed, color:C.green, sub:"Done, locked, and moved down" },
    ];
    const active = categories.find(c => c.key === taskCategoryView) || null;
    return (
      <div style={{ ...PNL, minWidth:0, borderLeft:"4px solid "+(active ? active.color : C.blue) }}>
        {sectionTitle("TASK CATEGORIES", "Late, undone, in-progress, and completed tasks are separated for cleaner execution.", active ? <Btn small ghost onClick={() => setTaskCategoryView(null)}>Close View More</Btn> : null)}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:10, marginBottom:active ? 14 : 0 }}>
          {categories.map(cat => (
            <div key={cat.key} style={{ background:C.bg, border:"1px solid "+(taskCategoryView === cat.key ? cat.color : C.border), borderLeft:"4px solid "+cat.color, borderRadius:10, padding:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"center" }}><span style={{ color:C.cream, fontSize:12, fontWeight:900 }}>{cat.title}</span><Badge color={cat.color}>{cat.list.length}</Badge></div>
              <div style={{ color:C.muted, fontSize:11, margin:"5px 0 9px" }}>{cat.sub}</div>
              <Btn small ghost onClick={() => setTaskCategoryView(taskCategoryView === cat.key ? null : cat.key)}>View More</Btn>
            </div>
          ))}
        </div>
        {active && (
          <div style={{ display:"grid", gap:8, maxHeight:360, overflowY:"auto" }}>
            {active.list.length ? active.list.slice(0, 20).map(task => <TaskRow key={task.id} task={task} compact />) : <Empty text={`No ${active.title.toLowerCase()} now.`} />}
          </div>
        )}
      </div>
    );
  };

  const FinancialHealthPanel = () => (
    <div style={{ ...PNL, minWidth:0, borderLeft:"4px solid "+C.gold }}>
      {sectionTitle("FINANCIAL HEALTH", "Track daily income, expenses, ITSINDA, purchases, and future goals.", <Btn small ghost onClick={() => goView("money", "list")}>Open Money Space</Btn>)}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))", gap:10, marginBottom:14 }}>
        {[
          { l:"Today Income", v:rwf(moneyStats.todayIncome), c:C.green },
          { l:"Today Expense", v:rwf(moneyStats.todayExpense), c:C.red },
          { l:"Net Balance", v:rwf(moneyStats.todayNet), c:moneyStats.todayNet >= 0 ? C.green : C.red },
          { l:"Weekly Savings", v:rwf(moneyStats.weeklySavings), c:C.gold },
          { l:"Monthly Savings", v:rwf(moneyStats.monthlySavings), c:C.blue },
          { l:"ITSINDA", v:moneyStats.itsindaPaid ? "Paid" : "Pending", c:moneyStats.itsindaPaid ? C.green : C.orange },
        ].map(x => <div key={x.l} style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:10 }}><div style={{ color:x.c, fontWeight:900, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{x.v}</div><div style={{ color:C.creamSoft, fontSize:11, marginTop:4 }}>{x.l}</div></div>)}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:12 }}>
        <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, padding:12 }}>
          <div style={{ color:C.gold, fontSize:11, letterSpacing:2, marginBottom:8 }}>DAILY LEDGER</div>
          <Select label="TYPE" options={["income", "expense", "savings"]} value={moneyForm.type} onChange={e => setMoneyForm(f => ({ ...f, type:e.target.value }))} />
          <Input label="AMOUNT" type="number" value={moneyForm.amount} onChange={e => setMoneyForm(f => ({ ...f, amount:e.target.value }))} placeholder="Example: 20000" />
          <Input label="CATEGORY" value={moneyForm.category} onChange={e => setMoneyForm(f => ({ ...f, category:e.target.value }))} placeholder="Transport, Client payment, ITSINDA..." />
          <Input label="NOTE" value={moneyForm.note} onChange={e => setMoneyForm(f => ({ ...f, note:e.target.value }))} placeholder="What happened?" />
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}><Btn orange onClick={() => addMoneyEntry(moneyForm.type)}>Add Entry</Btn><Btn ghost onClick={markItsindaPaid}>Mark ITSINDA Paid</Btn></div>
        </div>
        <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, padding:12 }}>
          <div style={{ color:C.gold, fontSize:11, letterSpacing:2, marginBottom:8 }}>PLANNED PURCHASES</div>
          <div style={{ display:"grid", gap:8, marginBottom:10 }}>
            {purchaseGoals.slice(0, 3).map(goal => { const pct = moneyProgress(goal.savedAmount, goal.targetAmount); return <div key={goal.id} style={{ border:"1px solid "+C.border, borderRadius:10, padding:9 }}><div style={{ display:"flex", justifyContent:"space-between", gap:8 }}><b style={{ color:C.cream, fontSize:12 }}>{goal.title}</b><Badge color={C.gold}>{pct}%</Badge></div><ProgressBar value={pct} color={C.gold} height={6} /><div style={{ color:C.muted, fontSize:11, marginTop:5 }}>{rwf(goal.savedAmount)} / {rwf(goal.targetAmount)}</div></div>; })}
          </div>
          <Input label="NEW PURCHASE" value={purchaseForm.title} onChange={e => setPurchaseForm(f => ({ ...f, title:e.target.value }))} placeholder="Laptop, camera, tablet..." />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}><Input label="TARGET" type="number" value={purchaseForm.targetAmount} onChange={e => setPurchaseForm(f => ({ ...f, targetAmount:e.target.value }))} /><Input label="SAVED" type="number" value={purchaseForm.savedAmount} onChange={e => setPurchaseForm(f => ({ ...f, savedAmount:e.target.value }))} /></div>
          <Btn small orange onClick={addPurchaseGoal}>Add Purchase Goal</Btn>
        </div>
        <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, padding:12 }}>
          <div style={{ color:C.gold, fontSize:11, letterSpacing:2, marginBottom:8 }}>FUTURE GOALS</div>
          <div style={{ display:"grid", gap:8, marginBottom:10 }}>
            {futureGoals.slice(0, 3).map(goal => { const pct = moneyProgress(goal.savedAmount, goal.targetAmount); return <div key={goal.id} style={{ border:"1px solid "+C.border, borderRadius:10, padding:9 }}><div style={{ display:"flex", justifyContent:"space-between", gap:8 }}><b style={{ color:C.cream, fontSize:12 }}>{goal.title}</b><Badge color={C.blue}>{pct}%</Badge></div><ProgressBar value={pct} color={C.blue} height={6} /><div style={{ color:C.muted, fontSize:11, marginTop:5 }}>{goal.category || "Future"} · {rwf(goal.savedAmount)} / {rwf(goal.targetAmount)}</div></div>; })}
          </div>
          <Input label="NEW FUTURE GOAL" value={futureForm.title} onChange={e => setFutureForm(f => ({ ...f, title:e.target.value }))} placeholder="Buy land, studio, car..." />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}><Input label="TARGET" type="number" value={futureForm.targetAmount} onChange={e => setFutureForm(f => ({ ...f, targetAmount:e.target.value }))} /><Input label="SAVED" type="number" value={futureForm.savedAmount} onChange={e => setFutureForm(f => ({ ...f, savedAmount:e.target.value }))} /></div>
          <Btn small orange onClick={addFutureGoal}>Add Future Goal</Btn>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"grid", gap:16, minWidth:0 }}>
      <div style={{ ...PNL, minWidth:0, borderLeft:"4px solid "+C.blue }}>
        {sectionTitle("TODAY DISCIPLINE PLAN", "Follow the current block first. This plan must stay above the command center.", <Btn small ghost onClick={() => setShowFullSchedule(v => !v)}>{showFullSchedule ? "Hide Schedule" : "Show Full Schedule"}</Btn>)}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))", gap:10, marginBottom:12 }}>
          <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:10 }}><div style={{ color:C.orange, fontWeight:900, fontSize:20 }}>{currentBlock ? currentBlock.start : dayComplete ? "23:00" : "06:00"}</div><div style={{ color:C.creamSoft, fontSize:11 }}>Current block</div></div>
          <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:10 }}><div style={{ color:C.green, fontWeight:900, fontSize:20 }}>{completedBlocks.length}</div><div style={{ color:C.creamSoft, fontSize:11 }}>Completed time</div></div>
          <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:10 }}><div style={{ color:C.blue, fontWeight:900, fontSize:20 }}>{remainingBlocks.length}</div><div style={{ color:C.creamSoft, fontSize:11 }}>Remaining blocks</div></div>
          <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:10 }}><div style={{ color:C.gold, fontWeight:900, fontSize:20 }}>{formatMinutes(nowMinutes)}</div><div style={{ color:C.creamSoft, fontSize:11 }}>Now</div></div>
        </div>
        <div style={{ color:dayComplete ? C.green : !dayStarted ? C.gold : C.cream, fontSize:13, marginBottom:12, lineHeight:1.5 }}>{disciplineMessage}</div>
        <div style={{ display:"grid", gap:8 }}>
          {showFullSchedule
            ? scheduleBlocks.map(block => <ScheduleRow key={block.start + block.title} block={block} />)
            : schedulePreviewBlocks.length ? schedulePreviewBlocks.map(block => <ScheduleRow key={block.start + block.title} block={block} />) : <Empty text={disciplineMessage} />}
        </div>
      </div>
      <CommandCenterControlPanel />
      {commandVisible("coach") && <div style={{ order:commandOrder("coach") }}><CoachPanel /></div>}
      {commandVisible("stats") && <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(2px, 1fr))", gap:12, order:commandOrder("stats") }}>
        <StatCard label="Active Tasks" value={activeTaskCount} color={C.blue} sub="Still open" />
        <StatCard label="Completed" value={done} color={C.green} sub="Locked history" />
        <StatCard label="Overdue" value={dashboardData.overdue.length} color={dashboardData.overdue.length ? C.red : C.green} sub="Late tasks" />
        <StatCard label="Routine Progress" value={`${routinePct}%`} color={routinePct >= 80 ? C.green : routinePct >= 40 ? C.orange : C.red} sub={`${completedRoutineKeys.size}/${DAILY_ROUTINES.length} done`} />
        <StatCard label="Expired Docs" value={documentAlerts.expired.length} color={documentAlerts.expired.length ? C.red : C.green} sub="Need renewal" />
        <StatCard label="Expiring Docs" value={documentAlerts.expiringSoon.length} color={documentAlerts.expiringSoon.length ? C.orange : C.green} sub={`Within ${documentWarningDays} days`} />
      </div>}

      {commandVisible("taskCategories") && <div style={{ order:commandOrder("taskCategories") }}><TaskCategoryPanel /></div>}

      <div style={{ display:"grid", gridTemplateColumns:"minmax(0, 1.35fr) minmax(320px, .65fr)", gap:16, alignItems:"start" }}>
        <div style={{ display:"grid", gap:16, minWidth:0 }}>
          {commandVisible("todayFocus") && <div style={{ ...PNL, padding:22, background:`linear-gradient(135deg, ${C.surface}, ${C.elevated})`, borderLeft:"4px solid "+C.orange, order:commandOrder("todayFocus") }}>
            {sectionTitle("TODAY FOCUS / PRIORITY ACTIONS", "A clean control center for the next important work.", <Badge color={C.orange}>Top {dashboardData.todayFocus.length}</Badge>)}
            <div style={{ color:C.creamSoft, fontSize:13, lineHeight:1.55, marginBottom:14 }}>
              Focus on overdue, urgent, and due-today work first. Workspace completion is <b style={{ color:C.green }}>{completionPct}%</b>.
            </div>
            <div style={{ display:"grid", gap:8 }}>
              {dashboardData.todayFocus.length ? sortTasksSmart(dashboardData.todayFocus).map(t => <TaskRow key={t.id} task={t} compact />) : <Empty text="No urgent priority found. Use this time for MOPAS follow-up or creative growth." />}
            </div>
          </div>}

          {commandVisible("lateTasks") && <div style={{ order:commandOrder("lateTasks") }}><LateTasksPanel /></div>}

          {commandVisible("dailyRoutine") && <div style={{ ...PNL, minWidth:0, borderLeft:"4px solid "+C.gold, order:commandOrder("dailyRoutine") }}>
            {sectionTitle("DAILY ROUTINE PROGRESS", "Daily tasks are created once per day and missed routines stay as history.", <Badge color={tomorrowReady ? C.green : C.gold}>{tomorrowReady ? "Tomorrow ready" : "Tomorrow not prepared"}</Badge>)}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))", gap:10, marginBottom:14 }}>
              <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:11 }}><div style={{ color:C.green, fontSize:22, fontWeight:900 }}>{completedRoutineKeys.size}</div><div style={{ color:C.creamSoft, fontSize:11 }}>Completed</div></div>
              <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:11 }}><div style={{ color:unfinishedRoutineTasks.length ? C.orange : C.green, fontSize:22, fontWeight:900 }}>{unfinishedRoutineTasks.length}</div><div style={{ color:C.creamSoft, fontSize:11 }}>Unfinished</div></div>
              <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:11 }}><div style={{ color:C.gold, fontSize:22, fontWeight:900 }}>{routinePct}%</div><div style={{ color:C.creamSoft, fontSize:11 }}>Today routine</div></div>
              <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:11 }}><div style={{ color:tomorrowReady ? C.green : C.gold, fontSize:22, fontWeight:900 }}>{tomorrowRoutineKeys.size}/{DAILY_ROUTINES.length}</div><div style={{ color:C.creamSoft, fontSize:11 }}>Tomorrow prep</div></div>
            </div>
            <ProgressBar value={routinePct} color={routinePct >= 80 ? C.green : routinePct >= 40 ? C.orange : C.red} height={7} />
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(210px, 1fr))", gap:8, marginTop:14 }}>
              {routineStreaks.map(r => {
                const task = todayRoutineTasks.find(t => t.routineKey === r.routineKey);
                const complete = task && task.status === "Done";
                return (
                  <div key={r.routineKey} onClick={() => task && openTask(task)} style={{ background:C.bg, border:"1px solid "+C.border, borderLeft:"4px solid "+(complete ? C.green : priorityColor(r.priority)), borderRadius:10, padding:10, cursor:task ? "pointer" : "default", minWidth:0 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start" }}>
                      <div style={{ minWidth:0 }}>
                        <div style={{ color:C.cream, fontSize:13, fontWeight:800, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.time ? r.time + " · " : ""}{r.title}</div>
                        <div style={{ color:C.muted, fontSize:11, marginTop:3 }}>{r.folder} · {task ? task.status : "Not created"}</div>
                      </div>
                      <Badge color={complete ? C.green : priorityColor(r.priority)}>{complete ? "Done" : r.priority}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>}

          {commandVisible("endDayReview") && <div style={{ ...PNL, minWidth:0, borderLeft:"4px solid "+(tomorrowReady ? C.green : C.gold), order:commandOrder("endDayReview") }}>
            {sectionTitle("END DAY REVIEW", "Close today without losing routine history.")}
            <div style={{ color:C.cream, fontSize:14, fontWeight:800, marginBottom:8 }}>{dayComplete ? "Ready to close today" : "Prepare the close-out early"}</div>
            <div style={{ color:C.creamSoft, fontSize:12, lineHeight:1.5, marginBottom:12 }}>
              Save today’s review, move unfinished normal tasks to tomorrow, and generate tomorrow’s routine when needed.
            </div>
            <div style={{ display:"grid", gap:8 }}>
              <Badge color={tomorrowReady ? C.green : C.gold}>{tomorrowReady ? "Tomorrow preparation complete" : "Tomorrow routine not fully ready"}</Badge>
              <Badge color={unfinishedRoutineTasks.length ? C.orange : C.green}>{unfinishedRoutineTasks.length} routine task(s) open today</Badge>
              <Btn orange onClick={() => setShowEndDayReview(true)}>Open End Day Review</Btn>
            </div>
          </div>}

          {commandVisible("tomorrowPrep") && <div style={{ ...PNL, minWidth:0, borderLeft:"4px solid "+C.blue, order:commandOrder("tomorrowPrep") }}>
            {sectionTitle("TOMORROW PREPARATION STATUS", "Routine readiness and priority carry-over.")}
            <div style={{ display:"grid", gap:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", color:C.creamSoft, fontSize:12 }}><span>Tomorrow routine tasks</span><b style={{ color:tomorrowReady ? C.green : C.gold }}>{tomorrowRoutineKeys.size}/{DAILY_ROUTINES.length}</b></div>
              <ProgressBar value={DAILY_ROUTINES.length ? Math.round((tomorrowRoutineKeys.size / DAILY_ROUTINES.length) * 100) : 0} color={tomorrowReady ? C.green : C.gold} height={7} />
              <div style={{ color:C.muted, fontSize:11, lineHeight:1.5 }}>Use End Day Review to prepare tomorrow and keep today’s missed routines as a record.</div>
            </div>
          </div>}
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:`repeat(auto-fit, minmax(${commandGridMin}px, 1fr))`, gap:commandCardGap }}>
        {commandVisible("lifeOS") && <div style={{ order:commandOrder("lifeOS") }}><LifeOSUpgradePanel /></div>}
        {commandVisible("miniCalendar") && <div style={{ order:commandOrder("miniCalendar") }}><MiniCalendarPanel /></div>}
        {commandVisible("goalProgress") && <div style={{ order:commandOrder("goalProgress") }}><GoalProgressPanel /></div>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:`repeat(auto-fit, minmax(${commandGridMin}px, 1fr))`, gap:commandCardGap }}>
        {commandVisible("mopasAlerts") && <div style={{ ...PNL, minWidth:0, borderLeft:"4px solid "+C.blue, order:commandOrder("mopasAlerts") }}>
          {sectionTitle("MOPAS ALERTS", "Urgent tender and operations work.", <Btn small ghost onClick={() => goView("mopas", "list")}>Open MOPAS</Btn>)}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(120px, 1fr))", gap:10, marginBottom:12 }}>
            {[{l:"Open",v:dashboardData.mopasOpen.length,c:C.orange},{l:"Urgent",v:dashboardData.mopasOpen.filter(t => t.priority === "Urgent").length,c:C.red},{l:"Due this week",v:dashboardData.mopasThisWeek.length,c:C.blue},{l:"Done",v:dashboardData.mopas.filter(t => t.status === "Done").length,c:C.green}].map(x => (
              <div key={x.l} style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:10 }}>
                <div style={{ color:x.c, fontWeight:900, fontSize:20 }}>{x.v}</div>
                <div style={{ color:C.creamSoft, fontSize:11 }}>{x.l}</div>
              </div>
            ))}
          </div>
          <div style={{ display:"grid", gap:8 }}>
            {dashboardData.mopasUrgent.length ? dashboardData.mopasUrgent.map(t => <TaskRow key={t.id} task={t} compact />) : <Empty text="No urgent MOPAS task now." />}
          </div>
        </div>}

        {commandVisible("documentAlerts") && <div style={{ ...PNL, minWidth:0, borderLeft:"4px solid "+(documentAlerts.expired.length ? C.red : documentAlerts.expiringSoon.length ? C.orange : C.green), order:commandOrder("documentAlerts") }}>
          {sectionTitle("DOCUMENT EXPIRY ALERTS", "Expired and expiring documents from the document tracker.", <Btn small ghost onClick={() => goView(null, "documents")}>Open Documents</Btn>)}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:12 }}>
            <AlertList title="Expired" list={documentAlerts.expired} color={C.red} emptyText="No expired document." type="doc" />
            <AlertList title="Expiring Soon" list={documentAlerts.expiringSoon} color={C.orange} emptyText="No document expiring within 30 days." type="doc" />
          </div>
        </div>}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:`repeat(auto-fit, minmax(${commandGridMin}px, 1fr))`, gap:commandCardGap }}>
        {commandVisible("weeklyProgress") && <div style={{ order:commandOrder("weeklyProgress") }}><WeeklyPanel /></div>}
        {commandVisible("spaceHealth") && <div style={{ order:commandOrder("spaceHealth") }}><SpaceHealthPanel /></div>}
      </div>
    </div>
  );
}


function MoneySpaceFinancialHealth({ tasks = [], onUpdate }) {
  const [moneyEntries, setMoneyEntries] = useState(() => readStore(MONEY_ENTRIES_KEY, []));
  const [purchaseGoals, setPurchaseGoals] = useState(() => readStore(PURCHASE_GOALS_KEY, DEFAULT_PURCHASE_GOALS));
  const [futureGoals, setFutureGoals] = useState(() => readStore(FUTURE_GOALS_KEY, DEFAULT_FUTURE_GOALS));
  const [moneyForm, setMoneyForm] = useState({ id:"", date:localTodayISO(), type:"expense", amount:"", category:"", note:"", linkType:"none", linkedId:"" });
  const [purchaseForm, setPurchaseForm] = useState({ id:"", title:"", targetAmount:"", savedAmount:"", priority:"High", deadline:"", note:"" });
  const [futureForm, setFutureForm] = useState({ id:"", title:"", targetAmount:"", savedAmount:"", deadline:"", category:"Life Goal", note:"" });
  const [showMoreMoney, setShowMoreMoney] = useState(true);
  const [moneyMode, setMoneyMode] = useState("overview");

  useEffect(() => { writeStore(MONEY_ENTRIES_KEY, moneyEntries); }, [moneyEntries]);
  useEffect(() => { writeStore(PURCHASE_GOALS_KEY, purchaseGoals); }, [purchaseGoals]);
  useEffect(() => { writeStore(FUTURE_GOALS_KEY, futureGoals); }, [futureGoals]);

  const todayKey = localTodayISO();
  const monthStartKey = todayKey.slice(0, 7);
  const week = getWeekRangeKeys(new Date());
  const safeEntries = Array.isArray(moneyEntries) ? moneyEntries : [];
  const safePurchases = Array.isArray(purchaseGoals) ? purchaseGoals : [];
  const safeFutureGoals = Array.isArray(futureGoals) ? futureGoals : [];

  const moneyStats = useMemo(() => {
    const entries = Array.isArray(moneyEntries) ? moneyEntries : [];
    const weekRange = getWeekRangeKeys(new Date());
    const byDate = entries.filter(e => e.date === todayKey);
    const inWeek = entries.filter(e => e.date >= weekRange.start && e.date <= weekRange.end);
    const inMonth = entries.filter(e => String(e.date || "").startsWith(monthStartKey));
    const sum = (items, type) => items.filter(e => e.type === type).reduce((total, e) => total + numberValue(e.amount), 0);
    const todayIncome = sum(byDate, "income");
    const todayExpense = sum(byDate, "expense");
    const todaySavings = sum(byDate, "savings");
    const weeklySavings = sum(inWeek, "savings");
    const monthlySavings = sum(inMonth, "savings");
    const monthIncome = sum(inMonth, "income");
    const monthExpense = sum(inMonth, "expense");
    const itsindaThisWeek = inWeek.filter(e => String(e.category || "").toLowerCase().includes("itsinda") || e.linkType === "itsinda").reduce((total, e) => total + numberValue(e.amount), 0);
    const itsindaPaid = itsindaThisWeek >= ITSINDA_WEEKLY_AMOUNT || tasks.some(t => t.routineKey === "itsinda-weekly-savings" && t.routineDate >= weekRange.start && t.routineDate <= weekRange.end && t.status === "Done");
    const totalPurchaseSaved = safePurchases.reduce((total, goal) => total + numberValue(goal.savedAmount), 0);
    const totalPurchaseTarget = safePurchases.reduce((total, goal) => total + numberValue(goal.targetAmount), 0);
    const totalFutureSaved = safeFutureGoals.reduce((total, goal) => total + numberValue(goal.savedAmount), 0);
    const totalFutureTarget = safeFutureGoals.reduce((total, goal) => total + numberValue(goal.targetAmount), 0);
    return {
      todayIncome, todayExpense, todaySavings, todayNet:todayIncome - todayExpense,
      weeklySavings, monthlySavings, monthIncome, monthExpense, monthNet:monthIncome - monthExpense,
      itsindaThisWeek, itsindaPaid,
      purchaseProgress:moneyProgress(totalPurchaseSaved, totalPurchaseTarget),
      futureProgress:moneyProgress(totalFutureSaved, totalFutureTarget),
    };
  }, [moneyEntries, tasks, todayKey, monthStartKey, safePurchases, safeFutureGoals]);

  const resetMoneyForm = () => setMoneyForm({ id:"", date:todayKey, type:"expense", amount:"", category:"", note:"", linkType:"none", linkedId:"" });
  const resetPurchaseForm = () => setPurchaseForm({ id:"", title:"", targetAmount:"", savedAmount:"", priority:"High", deadline:"", note:"" });
  const resetFutureForm = () => setFutureForm({ id:"", title:"", targetAmount:"", savedAmount:"", deadline:"", category:"Life Goal", note:"" });

  const applyGoalImpact = (entry, direction = 1) => {
    if (!entry || entry.type !== "savings") return;
    const amount = numberValue(entry.amount) * direction;
    if (!amount) return;
    if (entry.linkType === "purchase" && entry.linkedId) {
      setPurchaseGoals(prev => (Array.isArray(prev) ? prev : []).map(goal => goal.id === entry.linkedId ? { ...goal, savedAmount:Math.max(0, numberValue(goal.savedAmount) + amount) } : goal));
    }
    if (entry.linkType === "future" && entry.linkedId) {
      setFutureGoals(prev => (Array.isArray(prev) ? prev : []).map(goal => goal.id === entry.linkedId ? { ...goal, savedAmount:Math.max(0, numberValue(goal.savedAmount) + amount) } : goal));
    }
  };

  const normalizeMoneyEntryFromForm = (form) => {
    const type = form.type || "expense";
    const linkType = type === "savings" ? (form.linkType || "none") : "none";
    const category = linkType === "itsinda" ? "ITSINDA" : (form.category || (type === "savings" ? "Savings" : type === "income" ? "Income" : "Expense"));
    return {
      id: form.id || "ME-" + Date.now(),
      date: isDateKey(form.date) ? form.date : todayKey,
      type,
      amount:numberValue(form.amount),
      category,
      note:form.note || "",
      linkType,
      linkedId: linkType === "purchase" || linkType === "future" ? (form.linkedId || "") : "",
      updatedAt:new Date().toISOString(),
    };
  };

  const saveMoneyEntry = () => {
    const entry = normalizeMoneyEntryFromForm(moneyForm);
    if (!entry.amount) return;
    if (moneyForm.id) {
      const oldEntry = safeEntries.find(e => e.id === moneyForm.id);
      applyGoalImpact(oldEntry, -1);
      applyGoalImpact(entry, 1);
      setMoneyEntries(prev => (Array.isArray(prev) ? prev : []).map(e => e.id === moneyForm.id ? entry : e));
    } else {
      applyGoalImpact(entry, 1);
      setMoneyEntries(prev => [entry, ...(Array.isArray(prev) ? prev : [])]);
    }
    resetMoneyForm();
  };

  const editMoneyEntry = (entry) => {
    setMoneyMode("ledger");
    setShowMoreMoney(true);
    setMoneyForm({
      id:entry.id || "",
      date:entry.date || todayKey,
      type:entry.type || "expense",
      amount:String(entry.amount || ""),
      category:entry.category || "",
      note:entry.note || "",
      linkType:entry.linkType || (String(entry.category || "").toLowerCase().includes("itsinda") ? "itsinda" : "none"),
      linkedId:entry.linkedId || "",
    });
  };

  const deleteMoneyEntry = (entry) => {
    applyGoalImpact(entry, -1);
    setMoneyEntries(prev => (Array.isArray(prev) ? prev : []).filter(e => e.id !== entry.id));
    if (moneyForm.id === entry.id) resetMoneyForm();
  };

  const markItsindaPaid = () => {
    const entry = { id:"ME-ITSINDA-" + Date.now(), date:todayKey, type:"savings", amount:ITSINDA_WEEKLY_AMOUNT, category:"ITSINDA", note:"Weekly ITSINDA contribution", linkType:"itsinda", linkedId:"", updatedAt:new Date().toISOString() };
    setMoneyEntries(prev => [entry, ...(Array.isArray(prev) ? prev : [])]);
    const fridayTask = tasks.find(t => t.routineKey === "itsinda-weekly-savings" && t.routineDate >= week.start && t.routineDate <= week.end);
    if (fridayTask && typeof onUpdate === "function") onUpdate({ ...fridayTask, status:"Done", completedAt:new Date().toISOString(), locked:true });
  };

  const savePurchaseGoal = () => {
    if (!String(purchaseForm.title || "").trim()) return;
    const goal = { ...purchaseForm, id:purchaseForm.id || "PG-" + Date.now(), title:purchaseForm.title.trim(), targetAmount:numberValue(purchaseForm.targetAmount), savedAmount:numberValue(purchaseForm.savedAmount), priority:purchaseForm.priority || "High", deadline:purchaseForm.deadline || "", note:purchaseForm.note || "" };
    setPurchaseGoals(prev => purchaseForm.id ? (Array.isArray(prev) ? prev : []).map(g => g.id === purchaseForm.id ? goal : g) : [goal, ...(Array.isArray(prev) ? prev : [])]);
    resetPurchaseForm();
  };

  const saveFutureGoal = () => {
    if (!String(futureForm.title || "").trim()) return;
    const goal = { ...futureForm, id:futureForm.id || "FG-" + Date.now(), title:futureForm.title.trim(), targetAmount:numberValue(futureForm.targetAmount), savedAmount:numberValue(futureForm.savedAmount), deadline:futureForm.deadline || "", category:futureForm.category || "Life Goal", note:futureForm.note || "" };
    setFutureGoals(prev => futureForm.id ? (Array.isArray(prev) ? prev : []).map(g => g.id === futureForm.id ? goal : g) : [goal, ...(Array.isArray(prev) ? prev : [])]);
    resetFutureForm();
  };

  const deletePurchaseGoal = (id) => {
    setPurchaseGoals(prev => (Array.isArray(prev) ? prev : []).filter(goal => goal.id !== id));
    if (purchaseForm.id === id) resetPurchaseForm();
  };

  const deleteFutureGoal = (id) => {
    setFutureGoals(prev => (Array.isArray(prev) ? prev : []).filter(goal => goal.id !== id));
    if (futureForm.id === id) resetFutureForm();
  };

  const goalLabel = (entry) => {
    if (entry.linkType === "itsinda" || String(entry.category || "").toLowerCase().includes("itsinda")) return "ITSINDA weekly saving";
    if (entry.linkType === "purchase") return safePurchases.find(goal => goal.id === entry.linkedId)?.title || "Planned purchase";
    if (entry.linkType === "future") return safeFutureGoals.find(goal => goal.id === entry.linkedId)?.title || "Future goal";
    return "No goal link";
  };

  const SmallProgress = ({ value, color }) => (
    <div style={{ height:7, borderRadius:999, background:C.elevated, overflow:"hidden", marginTop:8 }}>
      <div style={{ width:`${Math.max(0, Math.min(100, Number(value) || 0))}%`, height:"100%", background:color, borderRadius:999 }} />
    </div>
  );

  const MoneyMiniCard = ({ label, value, color, sub }) => (
    <div style={{ background:C.surface, border:"1px solid "+C.border, borderRadius:10, padding:12 }}>
      <div style={{ color:C.creamSoft, fontSize:10, letterSpacing:1.2, textTransform:"uppercase" }}>{label}</div>
      <div style={{ color, fontWeight:900, fontSize:18, marginTop:4 }}>{value}</div>
      {sub && <div style={{ color:C.muted, fontSize:11, marginTop:2 }}>{sub}</div>}
    </div>
  );

  const moneyCards = [
    { l:"Today Income", v:rwf(moneyStats.todayIncome), c:C.green },
    { l:"Today Expense", v:rwf(moneyStats.todayExpense), c:C.red },
    { l:"Today Net", v:rwf(moneyStats.todayNet), c:moneyStats.todayNet >= 0 ? C.green : C.red },
    { l:"Weekly Savings", v:rwf(moneyStats.weeklySavings), c:C.gold },
    { l:"Monthly Savings", v:rwf(moneyStats.monthlySavings), c:C.blue },
    { l:"ITSINDA", v:moneyStats.itsindaPaid ? "Paid" : "Pending", c:moneyStats.itsindaPaid ? C.green : C.orange },
    { l:"Purchase Goals", v:`${moneyStats.purchaseProgress}%`, c:C.gold },
    { l:"Future Goals", v:`${moneyStats.futureProgress}%`, c:C.blue },
  ];

  const GoalRow = ({ goal, type }) => {
    const color = type === "purchase" ? C.gold : C.blue;
    const pct = moneyProgress(goal.savedAmount, goal.targetAmount);
    return (
      <div style={{ border:"1px solid "+C.border, borderLeft:"4px solid "+color, borderRadius:10, padding:10, background:C.surface }}>
        <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start" }}>
          <div style={{ minWidth:0 }}>
            <div style={{ color:C.cream, fontWeight:900, fontSize:13, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{goal.title}</div>
            <div style={{ color:C.muted, fontSize:11, marginTop:3 }}>{type === "purchase" ? goal.priority || "Normal" : goal.category || "Life Goal"}{goal.deadline ? " · " + goal.deadline : ""}</div>
          </div>
          <Badge color={color}>{pct}%</Badge>
        </div>
        <SmallProgress value={pct} color={color} />
        <div style={{ color:C.creamSoft, fontSize:11, marginTop:6 }}>{rwf(goal.savedAmount)} saved / {rwf(goal.targetAmount)} target</div>
        {goal.note && <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>{goal.note}</div>}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
          <Btn small ghost onClick={() => {
            if (type === "purchase") setPurchaseForm({ ...goal, targetAmount:String(goal.targetAmount || ""), savedAmount:String(goal.savedAmount || "") });
            else setFutureForm({ ...goal, targetAmount:String(goal.targetAmount || ""), savedAmount:String(goal.savedAmount || "") });
          }}>Edit</Btn>
          <Btn small ghost onClick={() => {
            setMoneyMode("ledger");
            setShowMoreMoney(true);
            setMoneyForm({ id:"", date:todayKey, type:"savings", amount:"", category:type === "purchase" ? "Purchase saving" : "Future goal saving", note:`Saving for ${goal.title}`, linkType:type, linkedId:goal.id });
          }}>Add Saving</Btn>
          <Btn small ghost style={{ color:C.red, borderColor:C.red }} onClick={() => type === "purchase" ? deletePurchaseGoal(goal.id) : deleteFutureGoal(goal.id)}>Delete</Btn>
        </div>
      </div>
    );
  };

  const recentEntries = safeEntries.slice(0, showMoreMoney ? 12 : 5);

  return (
    <div style={{ ...PNL, minWidth:0, borderLeft:"5px solid "+C.gold, marginBottom:16 }}>
      <div style={{ display:"grid", gridTemplateColumns:"minmax(0, 1fr) auto", gap:12, alignItems:"start", marginBottom:14 }}>
        <div>
          <div style={{ color:C.gold, fontSize:11, letterSpacing:2, fontWeight:900 }}>MONEY & SAVINGS / FINANCIAL HEALTH</div>
          <h2 style={{ margin:"4px 0 5px", color:C.cream, fontSize:22 }}>Financial Health</h2>
          <div style={{ color:C.creamSoft, fontSize:12, lineHeight:1.5 }}>Income, expenses, ITSINDA, planned purchases, and future goals are now connected. Savings can update a specific goal automatically.</div>
        </div>
        <Btn small orange onClick={() => setShowMoreMoney(v => !v)}>{showMoreMoney ? "Collapse Money" : "Open Money Tools"}</Btn>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(130px, 1fr))", gap:10, marginBottom:14 }}>
        {moneyCards.map(x => (
          <div key={x.l} style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:10 }}>
            <div style={{ color:x.c, fontWeight:900, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{x.v}</div>
            <div style={{ color:C.creamSoft, fontSize:11, marginTop:4 }}>{x.l}</div>
          </div>
        ))}
      </div>

      {showMoreMoney && (
        <>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
            {[
              ["overview", "Overview"], ["ledger", "Daily Ledger"], ["purchases", "Planned Purchases"], ["future", "Future Goals"], ["itsinda", "ITSINDA"]
            ].map(([key, label]) => <Btn key={key} small orange={moneyMode === key} ghost={moneyMode !== key} onClick={() => setMoneyMode(key)}>{label}</Btn>)}
          </div>

          {(moneyMode === "overview" || moneyMode === "ledger") && (
            <div style={{ display:"grid", gridTemplateColumns:"minmax(280px, 380px) minmax(0, 1fr)", gap:12, alignItems:"start", marginBottom:12 }}>
              <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, padding:12 }}>
                <div style={{ color:C.gold, fontSize:11, letterSpacing:2, marginBottom:8 }}>{moneyForm.id ? "EDIT MONEY ENTRY" : "ADD MONEY ENTRY"}</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  <Input label="DATE" type="date" value={moneyForm.date} onChange={e => setMoneyForm(f => ({ ...f, date:e.target.value }))} />
                  <Select label="TYPE" options={["income", "expense", "savings"]} value={moneyForm.type} onChange={e => setMoneyForm(f => ({ ...f, type:e.target.value, linkType:e.target.value === "savings" ? f.linkType : "none", linkedId:e.target.value === "savings" ? f.linkedId : "" }))} />
                </div>
                <Input label="AMOUNT" type="number" value={moneyForm.amount} onChange={e => setMoneyForm(f => ({ ...f, amount:e.target.value }))} placeholder="Example: 20000" />
                <Input label="CATEGORY" value={moneyForm.category} onChange={e => setMoneyForm(f => ({ ...f, category:e.target.value }))} placeholder="Transport, client payment, food, ITSINDA..." />
                {moneyForm.type === "savings" && (
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                    <Select label="RELATIONSHIP" options={["none", "itsinda", "purchase", "future"]} value={moneyForm.linkType} onChange={e => setMoneyForm(f => ({ ...f, linkType:e.target.value, linkedId:"", category:e.target.value === "itsinda" ? "ITSINDA" : f.category }))} />
                    <div style={{ marginBottom:12 }}>
                      <label style={{ display:"block", fontSize:11, color:C.creamSoft, marginBottom:4, letterSpacing:1 }}>LINKED GOAL</label>
                      <select disabled={moneyForm.linkType !== "purchase" && moneyForm.linkType !== "future"} value={moneyForm.linkedId} onChange={e => setMoneyForm(f => ({ ...f, linkedId:e.target.value }))} style={{ width:"100%", padding:"8px 12px", borderRadius:8, border:"1px solid "+C.border, background:C.bg, color:C.cream, fontSize:13, outline:"none", boxSizing:"border-box" }}>
                        <option value="">{moneyForm.linkType === "purchase" ? "Choose purchase goal" : moneyForm.linkType === "future" ? "Choose future goal" : "No goal needed"}</option>
                        {(moneyForm.linkType === "purchase" ? safePurchases : moneyForm.linkType === "future" ? safeFutureGoals : []).map(goal => <option key={goal.id} value={goal.id}>{goal.title}</option>)}
                      </select>
                    </div>
                  </div>
                )}
                <Textarea label="NOTE" value={moneyForm.note} onChange={e => setMoneyForm(f => ({ ...f, note:e.target.value }))} placeholder="What happened?" rows={2} />
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <Btn orange onClick={saveMoneyEntry}>{moneyForm.id ? "Save Changes" : "Add Entry"}</Btn>
                  <Btn ghost onClick={markItsindaPaid}>Mark ITSINDA Paid</Btn>
                  {moneyForm.id && <Btn ghost onClick={resetMoneyForm}>Cancel Edit</Btn>}
                </div>
              </div>

              <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, padding:12, minWidth:0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center", marginBottom:8 }}>
                  <div style={{ color:C.gold, fontSize:11, letterSpacing:2 }}>RECENT MONEY ENTRIES</div>
                  <Badge color={C.creamSoft}>{safeEntries.length}</Badge>
                </div>
                {!recentEntries.length ? <div style={{ color:C.muted, textAlign:"center", padding:18 }}>No money entry yet.</div> : recentEntries.map(entry => (
                  <div key={entry.id} style={{ display:"grid", gridTemplateColumns:"minmax(0,1fr) auto", gap:8, alignItems:"center", padding:"9px 10px", borderRadius:10, border:"1px solid "+C.border, background:C.surface, marginBottom:7 }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap", alignItems:"center" }}>
                        <Badge color={entry.type === "income" ? C.green : entry.type === "expense" ? C.red : C.gold}>{entry.type}</Badge>
                        <b style={{ color:entry.type === "expense" ? C.red : entry.type === "income" ? C.green : C.gold }}>{rwf(entry.amount)}</b>
                        <span style={{ color:C.muted, fontSize:11 }}>{entry.date}</span>
                      </div>
                      <div style={{ color:C.creamSoft, fontSize:12, marginTop:4, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{entry.category || "No category"} · {goalLabel(entry)}</div>
                      {entry.note && <div style={{ color:C.muted, fontSize:11, marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{entry.note}</div>}
                    </div>
                    <div style={{ display:"flex", gap:5, flexWrap:"wrap", justifyContent:"flex-end" }}>
                      <Btn small ghost onClick={() => editMoneyEntry(entry)}>Edit</Btn>
                      <Btn small ghost style={{ color:C.red, borderColor:C.red }} onClick={() => deleteMoneyEntry(entry)}>Delete</Btn>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(moneyMode === "overview" || moneyMode === "purchases") && (
            <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, padding:12, marginBottom:12 }}>
              <div style={{ color:C.gold, fontSize:11, letterSpacing:2, marginBottom:8 }}>PLANNED PURCHASES</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(230px, 1fr))", gap:10, marginBottom:12 }}>
                {safePurchases.map(goal => <GoalRow key={goal.id} goal={goal} type="purchase" />)}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:8, alignItems:"end" }}>
                <Input label={purchaseForm.id ? "EDIT PURCHASE" : "NEW PURCHASE"} value={purchaseForm.title} onChange={e => setPurchaseForm(f => ({ ...f, title:e.target.value }))} placeholder="Laptop, camera, tablet..." />
                <Input label="TARGET" type="number" value={purchaseForm.targetAmount} onChange={e => setPurchaseForm(f => ({ ...f, targetAmount:e.target.value }))} />
                <Input label="SAVED" type="number" value={purchaseForm.savedAmount} onChange={e => setPurchaseForm(f => ({ ...f, savedAmount:e.target.value }))} />
                <Select label="PRIORITY" options={["High", "Normal", "Low"]} value={purchaseForm.priority} onChange={e => setPurchaseForm(f => ({ ...f, priority:e.target.value }))} />
                <Input label="DEADLINE" type="date" value={purchaseForm.deadline} onChange={e => setPurchaseForm(f => ({ ...f, deadline:e.target.value }))} />
              </div>
              <Textarea label="NOTE" value={purchaseForm.note} onChange={e => setPurchaseForm(f => ({ ...f, note:e.target.value }))} rows={2} />
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}><Btn small orange onClick={savePurchaseGoal}>{purchaseForm.id ? "Save Purchase" : "Add Purchase"}</Btn>{purchaseForm.id && <Btn small ghost onClick={resetPurchaseForm}>Cancel Edit</Btn>}</div>
            </div>
          )}

          {(moneyMode === "overview" || moneyMode === "future") && (
            <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, padding:12, marginBottom:12 }}>
              <div style={{ color:C.gold, fontSize:11, letterSpacing:2, marginBottom:8 }}>FUTURE GOALS</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(230px, 1fr))", gap:10, marginBottom:12 }}>
                {safeFutureGoals.map(goal => <GoalRow key={goal.id} goal={goal} type="future" />)}
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(140px, 1fr))", gap:8, alignItems:"end" }}>
                <Input label={futureForm.id ? "EDIT FUTURE GOAL" : "NEW FUTURE GOAL"} value={futureForm.title} onChange={e => setFutureForm(f => ({ ...f, title:e.target.value }))} placeholder="Buy land, studio, car..." />
                <Input label="TARGET" type="number" value={futureForm.targetAmount} onChange={e => setFutureForm(f => ({ ...f, targetAmount:e.target.value }))} />
                <Input label="SAVED" type="number" value={futureForm.savedAmount} onChange={e => setFutureForm(f => ({ ...f, savedAmount:e.target.value }))} />
                <Input label="CATEGORY" value={futureForm.category} onChange={e => setFutureForm(f => ({ ...f, category:e.target.value }))} placeholder="Life Goal / Business Goal" />
                <Input label="DEADLINE" type="date" value={futureForm.deadline} onChange={e => setFutureForm(f => ({ ...f, deadline:e.target.value }))} />
              </div>
              <Textarea label="NOTE" value={futureForm.note} onChange={e => setFutureForm(f => ({ ...f, note:e.target.value }))} rows={2} />
              <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}><Btn small orange onClick={saveFutureGoal}>{futureForm.id ? "Save Future Goal" : "Add Future Goal"}</Btn>{futureForm.id && <Btn small ghost onClick={resetFutureForm}>Cancel Edit</Btn>}</div>
            </div>
          )}

          {moneyMode === "itsinda" && (
            <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, padding:14, marginBottom:12 }}>
              <div style={{ color:C.gold, fontSize:11, letterSpacing:2, marginBottom:8 }}>ITSINDA WEEKLY SAVINGS</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:10, marginBottom:12 }}>
                <MoneyMiniCard label="Weekly Target" value={rwf(ITSINDA_WEEKLY_AMOUNT)} color={C.gold} sub="Every Friday" />
                <MoneyMiniCard label="This Week Paid" value={rwf(moneyStats.itsindaThisWeek)} color={moneyStats.itsindaPaid ? C.green : C.orange} sub={moneyStats.itsindaPaid ? "Complete" : "Pending"} />
                <MoneyMiniCard label="Week Range" value={week.start} color={C.blue} sub={week.end} />
              </div>
              <Btn orange onClick={markItsindaPaid}>Mark This Week ITSINDA Paid</Btn>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ListView({ tasks, activeSpace, selected, setSelected, onUpdate, settings }) {
  const ordered = useMemo(() => sortTasksSmart(tasks), [tasks]);
  const doneCount = useMemo(() => tasks.filter(t => t.status === "Done").length, [tasks]);
  const lateCount = useMemo(() => tasks.filter(isLateTask).length, [tasks]);
  const [collapsedSections, setCollapsedSections] = useState(() => readStore(TASK_CATEGORY_COLLAPSE_KEY, {}));

  useEffect(() => { writeStore(TASK_CATEGORY_COLLAPSE_KEY, collapsedSections); }, [collapsedSections]);

  const taskSections = useMemo(() => {
    const late = sortTasksSmart(ordered.filter(t => t.status !== "Done" && isLateTask(t)));
    const inProgress = sortTasksSmart(ordered.filter(t => t.status === "In Progress" && !isLateTask(t)));
    const active = sortTasksSmart(ordered.filter(t => t.status !== "Done" && t.status !== "In Progress" && !isLateTask(t) && isDateKey(t.due)));
    const undone = sortTasksSmart(ordered.filter(t => t.status !== "Done" && t.status !== "In Progress" && !isLateTask(t) && !isDateKey(t.due)));
    const completed = sortTasksSmart(ordered.filter(t => t.status === "Done"));
    return [
      { key:"active", title:"ACTIVE TASKS", subtitle:"Open tasks with a deadline today or in the future.", items:active, color:C.blue, empty:"No active deadline task." },
      { key:"progress", title:"IN PROGRESS", subtitle:"Started tasks that are not late yet.", items:inProgress, color:C.orange, empty:"No task in progress." },
      { key:"late", title:"LATE TASKS", subtitle:"Deadline passed and the task is not done.", items:late, color:C.red, empty:"No late task." },
      { key:"undone", title:"UNDONE TASKS", subtitle:"Open tasks without a deadline.", items:undone, color:C.gold, empty:"No undone task without deadline." },
      { key:"done", title:"DONE TASKS", subtitle:"Completed tasks are always visible, locked, and at the bottom.", items:completed, color:C.green, empty:"No completed task yet." },
    ];
  }, [ordered]);

  const dueLabel = (t) => {
    if (!isDateKey(t.due)) return { label:"No deadline", color:C.muted };
    const late = taskLateInfo(t);
    if (late.isLate) return { label:late.label, color:C.red };
    const diff = daysBetweenLocal(localTodayISO(), t.due);
    if (diff === 0) return { label:"Today", color:C.orange };
    if (diff === 1) return { label:"Tomorrow", color:C.blue };
    return { label:t.due, color:C.creamSoft };
  };

  const toggleSection = (key) => setCollapsedSections(prev => ({ ...(prev || {}), [key]:!prev?.[key] }));
  const collapseAll = () => setCollapsedSections(taskSections.reduce((acc, section) => ({ ...acc, [section.key]:true }), {}));
  const expandAll = () => setCollapsedSections({});

  const renderTaskRow = (t) => {
    const due = dueLabel(t);
    const done = t.status === "Done";
    const late = taskLateInfo(t);
    const mopasType = t.space === "mopas" ? getMopasTaskType(t) : "";
    return (
      <div key={t.id} onClick={() => setSelected(t)} style={{ display:"grid", gridTemplateColumns:"auto minmax(0,1fr) auto", alignItems:"center", gap:12, padding:"10px 12px", borderRadius:8, marginBottom:6, cursor:"pointer", background: selected && selected.id === t.id ? C.elevated : late.isLate ? C.red+"10" : C.bg, border:"1px solid "+(selected && selected.id === t.id ? C.orange : done ? C.green : late.isLate ? C.red : C.border), borderLeft:"4px solid "+(done ? C.green : late.isLate ? C.red : mopasType === "Tender Working On" ? C.gold : due.color), opacity:done ? .58 : 1 }}>
        <span style={{ fontSize:14, width:24 }}>{done ? "✓" : late.isLate ? "◬" : t.status === "In Progress" ? "↻" : t.status === "Blocked" ? "Blocked" : "⫸"}</span>
        <div style={{ minWidth:0 }}>
          <div style={{ fontWeight:700, color:done ? C.muted : late.isLate ? C.red : C.cream, fontSize:14, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", textDecoration:done ? "line-through" : "none" }}>{t.title}</div>
          <div style={{ fontSize:11, color:C.muted, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{(t.folder || "General")+" / "+(t.list || "Tasks")}{t.time ? " · " + t.time : ""}</div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:5 }}>
            {mopasType && <Badge color={mopasType === "Tender Working On" ? C.gold : C.blue}>{mopasType}</Badge>}
            <Badge color={statusColor(t.status)}>{done ? "Completed" : t.status}</Badge>
            <Badge color={priorityColor(t.priority)}>{t.priority}</Badge>
            <Badge color={due.color}>{due.label}</Badge>
            {late.isLate && <Badge color={C.red}>Late · separated</Badge>}
            {done && <Badge color={C.green}>Locked</Badge>}
            {mopasType === "Tender Working On" && t.tenderStage && <Badge color={C.blue}>{t.tenderStage}</Badge>}
          </div>
        </div>
        <div style={{ display:"grid", gap:5 }}>
          {done ? (
            <Btn small orange onClick={(e) => { e.stopPropagation(); onUpdate({ ...t, status:"To Do", locked:false, completedAt:"" }); }}>Reopen</Btn>
          ) : STATUSES.filter(st => st !== t.status).slice(0,2).map(st => (
            <Btn key={st} small ghost onClick={(e) => { e.stopPropagation(); onUpdate({ ...t, status:st }); }}>{st}</Btn>
          ))}
        </div>
      </div>
    );
  };

  const renderSection = (section) => {
    const isCollapsed = !!collapsedSections?.[section.key];
    return (
      <div style={{ marginTop:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:isCollapsed ? 0 : 8, padding:"10px 12px", background:C.bg, border:"1px solid "+C.border, borderLeft:"4px solid "+section.color, borderRadius:10 }}>
          <div style={{ minWidth:0 }}>
            <div style={{ color:section.color, fontSize:12, letterSpacing:2, fontWeight:900 }}>{section.title}</div>
            <div style={{ color:C.creamSoft, fontSize:12, marginTop:2 }}>{section.subtitle}</div>
          </div>
          <div style={{ display:"flex", gap:7, alignItems:"center", flexWrap:"wrap" }}>
            <Badge color={section.color}>{section.items.length}</Badge>
            <Btn small ghost onClick={() => toggleSection(section.key)}>{isCollapsed ? "Expand" : "Collapse"}</Btn>
          </div>
        </div>
        {!isCollapsed && (!section.items.length ? <div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:18, background:C.bg, border:"1px dashed "+C.border, borderRadius:10, marginBottom:10 }}>{section.empty}</div> : section.items.map(renderTaskRow))}
      </div>
    );
  };

  return (
    <div style={PNL}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:12 }}>
        <div>
          <div style={{ color:C.gold, fontSize:11, letterSpacing:2 }}>TASK CATEGORIES</div>
          <div style={{ color:C.creamSoft, fontSize:12 }}>{lateCount ? `${lateCount} late task${lateCount === 1 ? "" : "s"} marked red and separated` : "Done tasks are always visible at the bottom"}</div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <Badge color={C.green}>{doneCount} done</Badge>
          <Btn small ghost onClick={collapseAll}>Collapse All</Btn>
          <Btn small ghost onClick={expandAll}>Expand All</Btn>
        </div>
      </div>
      {!ordered.length ? (
        <div style={{ color:C.muted, fontSize:13, textAlign:"center", padding:24, background:C.bg, border:"1px dashed "+C.border, borderRadius:10 }}>No task found with the current filters.</div>
      ) : (
        <div style={{ display:"grid", gap:12 }}>
          {taskSections.map(renderSection)}
        </div>
      )}
    </div>
  );
}

function BoardView({ tasks, selected, setSelected, onUpdate, settings }) {
  const orderedTasks = useMemo(() => sortTasksSmart(tasks), [tasks]);
  const nextStatus = (current, direction) => {
    const idx = STATUSES.indexOf(current);
    const next = Math.max(0, Math.min(STATUSES.length - 1, idx + direction));
    return STATUSES[next] || current;
  };
  const nextTenderStage = (current, direction) => {
    const idx = Math.max(0, TENDER_STAGES.indexOf(current || "New"));
    const next = Math.max(0, Math.min(TENDER_STAGES.length - 1, idx + direction));
    return TENDER_STAGES[next] || "New";
  };
  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:12 }}>
        <div style={{ color:C.creamSoft, fontSize:12 }}>Done tasks stay visible in the Done column and remain locked until reopened.</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(230px, 1fr))", gap:12 }}>
      {STATUSES.map(st => {
        const col = orderedTasks.filter(t => t.status === st);
        return (
          <div key={st} style={{ ...PNL, background:C.bg, minWidth:0 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
              <span style={{ fontWeight:800, color:statusColor(st), fontSize:13 }}>{st}</span>
              <span style={{ fontSize:11, color:C.muted }}>{col.length}</span>
            </div>
            {col.map(t => {
              const done = t.status === "Done";
              const late = taskLateInfo(t);
              return (
              <div key={t.id} onClick={() => setSelected(t)} style={{ background:C.surface, borderRadius:10, padding:12, marginBottom:8, cursor:"pointer", border: selected && selected.id === t.id ? "1px solid "+C.orange : "1px solid "+(done ? C.green : C.border), borderLeft:"4px solid "+(done ? C.green : late.isLate ? C.red : priorityColor(t.priority)), opacity:done ? .62 : 1 }}>
                <div style={{ fontWeight:700, fontSize:13, color:done ? C.muted : late.isLate ? C.red : C.cream, marginBottom:4, lineHeight:1.35, textDecoration:done ? "line-through" : "none" }}>{t.title}</div>
                <div style={{ color:C.muted, fontSize:11, marginBottom:8 }}>{t.due || "No deadline"}{t.time ? " · " + t.time : ""}</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:8 }}>
                  <Badge color={done ? C.green : priorityColor(t.priority)}>{done ? "Completed" : t.priority}</Badge>
                  {done && <Badge color={C.green}>Locked</Badge>}
                  {late.isLate && <Badge color={C.red}>{taskLateInfo(t).label}</Badge>}
                  {t.space === "mopas" && <Badge color={isMopasTenderWork(t) ? C.gold : C.blue}>{getMopasTaskType(t)}</Badge>}
                  {isMopasTenderWork(t) && t.tenderStage && <Badge color={C.blue}>{t.tenderStage}</Badge>}
                  <span style={{ fontSize:10, color:C.muted }}>{t.id}</span>
                </div>
                <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                  {done ? <Btn small orange onClick={(e) => { e.stopPropagation(); onUpdate({ ...t, status:"To Do", locked:false, completedAt:"" }); }}>Reopen</Btn> : (
                    <>
                      <Btn small ghost disabled={st === STATUSES[0]} onClick={(e) => { e.stopPropagation(); onUpdate({ ...t, status:nextStatus(t.status, -1) }); }}>←</Btn>
                      <Btn small ghost disabled={st === STATUSES[STATUSES.length - 1]} onClick={(e) => { e.stopPropagation(); onUpdate({ ...t, status:nextStatus(t.status, 1) }); }}>→</Btn>
                      {isMopasTenderWork(t) && (
                        <>
                          <Btn small ghost onClick={(e) => { e.stopPropagation(); onUpdate({ ...t, tenderStage:nextTenderStage(t.tenderStage, -1) }); }}>Tender ←</Btn>
                          <Btn small ghost onClick={(e) => { e.stopPropagation(); onUpdate({ ...t, tenderStage:nextTenderStage(t.tenderStage, 1) }); }}>Tender →</Btn>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            );})}
          </div>
        );
      })}
      </div>
    </div>
  );
}

function CalendarView({ tasks }) {
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const weekDays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const toISODate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };
  const safeTaskDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "";
  const startOfToday = new Date();
  const todayDate = new Date(startOfToday.getFullYear(), startOfToday.getMonth(), startOfToday.getDate());
  const todayKey = toISODate(todayDate);
  const [visibleDate, setVisibleDate] = useState(() => new Date(todayDate.getFullYear(), todayDate.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(todayKey);

  const year = visibleDate.getFullYear();
  const month = visibleDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const monthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

  const tasksByDate = useMemo(() => {
    return tasks.reduce((acc, task) => {
      const key = safeTaskDate(task.due);
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(task);
      return acc;
    }, {});
  }, [tasks]);

  const monthDeadlines = useMemo(() => {
    return tasks
      .filter(t => safeTaskDate(t.due).startsWith(monthKey))
      .slice()
      .sort((a, b) => String(a.due || "").localeCompare(String(b.due || "")) || String(a.time || "").localeCompare(String(b.time || "")) || String(a.title || "").localeCompare(String(b.title || "")));
  }, [tasks, monthKey]);

  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => {
    const day = i - firstDay + 1;
    if (day < 1 || day > daysInMonth) return null;
    return day;
  });

  const moveMonth = (amount) => {
    const next = new Date(year, month + amount, 1);
    setVisibleDate(next);
    setSelectedDate(toISODate(next));
  };
  const goToday = () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    setVisibleDate(new Date(todayStart.getFullYear(), todayStart.getMonth(), 1));
    setSelectedDate(toISODate(todayStart));
  };
  const dateKeyForDay = (day) => `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const taskTone = (task) => {
    const due = safeTaskDate(task.due);
    if (task.status === "Done") return { color:C.green, label:"Done" };
    if (!due) return { color:C.muted, label:"No due date" };
    if (due === todayKey) return { color:C.orange, label:"Due today" };
    const dueDate = new Date(due + "T00:00:00");
    if (dueDate < todayDate) return { color:C.red, label:"Overdue" };
    return { color:C.blue, label:"Future deadline" };
  };
  const dayTone = (dayTasks) => {
    if (!dayTasks.length) return null;
    const open = dayTasks.filter(t => t.status !== "Done");
    if (open.some(t => safeTaskDate(t.due) && new Date(safeTaskDate(t.due) + "T00:00:00") < todayDate)) return C.red;
    if (open.some(t => safeTaskDate(t.due) === todayKey)) return C.orange;
    if (open.length) return C.blue;
    return C.green;
  };

  const selectedTasks = selectedDate ? (tasksByDate[selectedDate] || []) : [];

  return (
    <div style={{ display:"grid", gridTemplateColumns:"minmax(0, 1fr)", gap:16 }}>
      <div style={PNL}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, marginBottom:16, flexWrap:"wrap" }}>
          <div>
            <div style={{ color:C.gold, fontSize:11, letterSpacing:2 }}>FULL MONTH CALENDAR</div>
            <h3 style={{ color:C.cream, margin:"4px 0 0", fontSize:24 }}>{monthNames[month]} {year}</h3>
          </div>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            <Btn small ghost onClick={() => moveMonth(-1)}>Previous Month</Btn>
            <Btn small orange onClick={goToday}>Today</Btn>
            <Btn small ghost onClick={() => moveMonth(1)}>Next Month</Btn>
          </div>
        </div>

        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:14 }}>
          <Badge color={C.blue}>Future deadline</Badge>
          <Badge color={C.orange}>Due today</Badge>
          <Badge color={C.red}>Overdue</Badge>
          <Badge color={C.green}>Done</Badge>
        </div>

        <div style={{ overflowX:"auto", paddingBottom:4 }}>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7, minmax(112px, 1fr))", gap:8, minWidth:780 }}>
            {weekDays.map(d => (
              <div key={d} style={{ textAlign:"center", fontSize:12, color:C.gold, padding:"8px 6px", fontWeight:800, letterSpacing:1, background:C.bg, borderRadius:8, border:"1px solid "+C.border }}>{d}</div>
            ))}
            {cells.map((day, i) => {
              if (!day) {
                return <div key={i} style={{ minHeight:118, borderRadius:10, background:"#00000018", border:"1px dashed "+C.border, opacity:.45 }} />;
              }
              const key = dateKeyForDay(day);
              const dayTasks = tasksByDate[key] || [];
              const isToday = key === todayKey;
              const selected = key === selectedDate;
              const tone = dayTone(dayTasks);
              return (
                <div
                  key={key}
                  onClick={() => setSelectedDate(key)}
                  style={{
                    minHeight:118,
                    borderRadius:10,
                    padding:8,
                    cursor:"pointer",
                    background: selected ? C.elevated : C.bg,
                    border: selected ? "1px solid "+C.orange : isToday ? "1px solid "+C.gold : "1px solid "+C.border,
                    boxShadow: isToday ? "0 0 0 2px "+C.orange+"33" : selected ? "0 0 0 2px "+C.orange+"22" : "none",
                    position:"relative",
                    overflow:"hidden",
                  }}
                >
                  {tone && <div style={{ position:"absolute", inset:"0 auto 0 0", width:4, background:tone }} />}
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6, marginBottom:6, paddingLeft:tone ? 2 : 0 }}>
                    <div style={{
                      width:28,
                      height:28,
                      borderRadius:"50%",
                      display:"flex",
                      alignItems:"center",
                      justifyContent:"center",
                      fontSize:13,
                      fontWeight:800,
                      color: isToday ? "#fff" : C.cream,
                      background: isToday ? C.orange : "transparent",
                    }}>{day}</div>
                    {dayTasks.length > 0 && <span style={{ fontSize:10, color:tone || C.creamSoft, fontWeight:800 }}>{dayTasks.length}</span>}
                  </div>
                  <div style={{ display:"grid", gap:4 }}>
                    {dayTasks.slice(0, 3).map(task => {
                      const toneInfo = taskTone(task);
                      return (
                        <div key={task.id} title={task.title} style={{
                          fontSize:10,
                          color:C.cream,
                          background:toneInfo.color+"24",
                          border:"1px solid "+toneInfo.color+"55",
                          borderLeft:"3px solid "+toneInfo.color,
                          borderRadius:6,
                          padding:"4px 6px",
                          overflow:"hidden",
                          whiteSpace:"nowrap",
                          textOverflow:"ellipsis",
                        }}>
                          {task.time ? task.time + " · " : ""}{task.title}
                        </div>
                      );
                    })}
                    {dayTasks.length > 3 && <div style={{ fontSize:10, color:C.gold, fontWeight:700, padding:"2px 3px" }}>+ {dayTasks.length - 3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(320px, 1fr))", gap:16 }}>
        <div style={PNL}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center", marginBottom:10 }}>
            <div>
              <div style={{ color:C.gold, fontSize:11, letterSpacing:2 }}>SELECTED DAY</div>
              <div style={{ color:C.creamSoft, fontSize:12, marginTop:2 }}>{selectedDate || "Select a day"}</div>
            </div>
            <Badge color={selectedTasks.length ? C.orange : C.muted}>{selectedTasks.length} tasks</Badge>
          </div>
          {!selectedTasks.length && <div style={{ color:C.muted, textAlign:"center", padding:24 }}>No tasks due on this day.</div>}
          {selectedTasks.map(task => {
            const tone = taskTone(task);
            return (
              <div key={task.id} style={{ background:C.bg, border:"1px solid "+C.border, borderLeft:"4px solid "+tone.color, borderRadius:10, padding:12, marginBottom:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"flex-start" }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ color:C.cream, fontWeight:700, fontSize:13, wordBreak:"break-word" }}>{task.title}</div>
                    <div style={{ color:C.muted, fontSize:11, marginTop:3 }}>{task.folder} / {task.list}</div>
                  </div>
                  <Badge color={tone.color}>{tone.label}</Badge>
                </div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginTop:8 }}>
                  <Badge color={statusColor(task.status)}>{task.status}</Badge>
                  <Badge color={priorityColor(task.priority)}>{task.priority}</Badge>
                  {task.time && <Badge color={C.creamSoft}>{task.time}</Badge>}
                </div>
              </div>
            );
          })}
        </div>

        <div style={PNL}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center", marginBottom:10 }}>
            <div>
              <div style={{ color:C.gold, fontSize:11, letterSpacing:2 }}>THIS MONTH DEADLINES</div>
              <div style={{ color:C.creamSoft, fontSize:12, marginTop:2 }}>{monthNames[month]} {year}</div>
            </div>
            <Badge color={C.blue}>{monthDeadlines.length} deadlines</Badge>
          </div>
          {!monthDeadlines.length && <div style={{ color:C.muted, textAlign:"center", padding:24 }}>No deadlines in this month.</div>}
          <div style={{ display:"grid", gap:8, maxHeight:360, overflowY:"auto", paddingRight:4 }}>
            {monthDeadlines.map(task => {
              const tone = taskTone(task);
              return (
                <div key={task.id} style={{ display:"grid", gridTemplateColumns:"88px minmax(0, 1fr) auto", gap:10, alignItems:"center", background:C.bg, border:"1px solid "+C.border, borderLeft:"4px solid "+tone.color, borderRadius:10, padding:10 }}>
                  <div style={{ color:tone.color, fontWeight:800, fontSize:12 }}>{task.due}</div>
                  <div style={{ minWidth:0 }}>
                    <div style={{ color:C.cream, fontWeight:700, fontSize:13, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{task.title}</div>
                    <div style={{ color:C.muted, fontSize:11 }}>{task.folder} · {task.time || "No time"}</div>
                  </div>
                  <Badge color={tone.color}>{tone.label}</Badge>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}


const DEFAULT_Goals = {
  wakeup: { title:"Wake-up Discipline Protocol", content:"Goal: become a man who controls his morning.\n\nDaily actions:\n• Wake up 6:00 AM\n• No phone first 30 minutes\n• Read 20 pages\n• Make bed\n• Plan top 3 tasks\n\nMeasure:\n• Days woke up on time\n• Pages read\n• Days planned" },
  mopas: { title:"MOPAS Work System", content:"Morning block: Tender preparation\n• Technical proposal\n• Financial offer\n• Administrative documents\n• Compliance tables\n\nMidday block: New tender search\n• Check Umucyo\n• Institutional sites & emails\n\nAfternoon block: Follow-up\n• Client follow-up\n• Quotations & delivery tracking\n\nEnd of day report:\n• Today I completed:\n• Pending:\n• Tomorrow priority:" },
  health: { title:"Health & Fitness System", content:"Run 4 km - 4 days per week\nMon, Tue, Thu, Sat\n\nOther days: walking, stretching, recovery\n\nMorning: 30 push-ups, squats, stretching, core/plank\n\nMeasure:\n• Push-ups completed\n• KM run per week\n• Sleep time & energy level" },
  drawing: { title:"Drawing & Creative Study", content:"2 hours drawingbox.com study:\n\nFirst 30 min: warm-up (lines, shapes, perspective)\nNext 60 min: main lesson\nLast 30 min: apply to own project\n\nDaily output - never finish with nothing saved:\n• 1 page of sketches\n• 1 perspective exercise\n• 1 character pose\n• 1 environment study\n• 1 storyboard frame\n\nWeekly:\nMon: drawing | Tue: 43 Project\nWed: drawing | Thu: hybrid style\nFri: AFTERGLOW | Sat: deep work\nSun: review & planning" },
  afterglow: { title:"AFTERGLOW Brand System", content:"Brand foundation:\n• Name meaning & mission\n• Visual style & logo\n• Tagline: Stories That Stay\n\nLogo versions needed:\n• Main logo (symbol + text + tagline)\n• Icon only\n• Horizontal, white bg, black bg\n• SVG editable & motion logo\n\nContent pillars:\n• Animation process\n• 3D/2D hybrid tests\n• Drawing progress\n• 43 Project research\n• Behind-the-scenes" },
  money: { title:"Money & Savings System", content:"Income split:\n50% - Needs\n20% - Savings\n20% - Career investment\n10% - Personal\n\nFirst target: 3 months emergency fund\n\nThen:\n• Better equipment\n• Brand investment\n• Project development\n• Business growth\n\nMeasure:\n• Amount saved\n• Debt reduced\n• Career tools purchased" },
};

function GoalsView({ activeSpace }) {
  const [storedGoals, setStoredGoals] = useState(() => readStore(Goals_TEXT_KEY, {}));
  const original = DEFAULT_Goals[activeSpace] || { title:"Documentation", content:"Select a space." };
  const activeDoc = storedGoals[activeSpace] || original;
  const [draft, setDraft] = useState(activeDoc);

  useEffect(() => {
    const next = storedGoals[activeSpace] || DEFAULT_Goals[activeSpace] || { title:"Documentation", content:"Select a space." };
    setDraft(next);
  }, [activeSpace, storedGoals]);

  const saveDoc = () => {
    const next = { ...storedGoals, [activeSpace]: { title: draft.title, content: draft.content } };
    setStoredGoals(next);
    writeStore(Goals_TEXT_KEY, next);
  };
  const resetDoc = () => {
    const next = { ...storedGoals };
    delete next[activeSpace];
    setStoredGoals(next);
    writeStore(Goals_TEXT_KEY, next);
    setDraft(original);
  };

  return (
    <div style={PNL}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center", marginBottom:14, flexWrap:"wrap" }}>
        <div>
          <div style={{ color:C.gold, fontSize:11, letterSpacing:2 }}>EDITABLE Goals</div>
          <div style={{ color:C.creamSoft, fontSize:12, marginTop:2 }}>Edit and save this space documentation.</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn ghost onClick={resetDoc}>Reset</Btn>
          <Btn orange onClick={saveDoc}>Save Goals</Btn>
        </div>
      </div>
      <Input label="Goals TITLE" value={draft.title} onChange={e => setDraft(d => ({ ...d, title:e.target.value }))} />
      <Textarea label="Goals DESCRIPTION / CONTENT" value={draft.content} onChange={e => setDraft(d => ({ ...d, content:e.target.value }))} rows={12} />
      <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:16, marginTop:12 }}>
        <div style={{ color:C.gold, fontSize:11, letterSpacing:2, marginBottom:8 }}>PREVIEW</div>
        <h3 style={{ color:C.cream, margin:"0 0 8px" }}>{draft.title}</h3>
        <pre style={{ color:C.creamSoft, fontFamily:"inherit", whiteSpace:"pre-wrap", lineHeight:1.7, fontSize:13, margin:0 }}>{draft.content}</pre>
      </div>
    </div>
  );
}

function SettingsView({ settings, setSettings, tasks, exportBackup, importBackup, resetSettingsOnly, clearTestData, sendTodayDisciplineEmail, emailNotice }) {
  const tabs = ["General", "Daily Routine", "Tasks & Deadlines", "Command Center", "MOPAS Tender", "Documents", "Backup & Data", "Appearance", "Notifications"];
  const [tab, setTab] = useState("General");
  const merged = mergeAppSettings(settings);
  const update = (section, key, value) => setSettings(prev => mergeAppSettings({ ...prev, [section]:{ ...(prev?.[section] || {}), [key]:value } }));
  const updateCommandSection = (key, value) => setSettings(prev => {
    const current = mergeAppSettings(prev || {});
    return mergeAppSettings({
      ...current,
      commandCenter:{
        ...current.commandCenter,
        sections:{ ...(current.commandCenter?.sections || {}), [key]:value },
      },
    });
  });
  const moveCommandSection = (key, direction) => setSettings(prev => {
    const current = mergeAppSettings(prev || {});
    const order = [...(current.commandCenter?.sectionOrder || DEFAULT_COMMAND_CENTER_ORDER)];
    const index = order.indexOf(key);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= order.length) return current;
    [order[index], order[nextIndex]] = [order[nextIndex], order[index]];
    return mergeAppSettings({ ...current, commandCenter:{ ...current.commandCenter, sectionOrder:order } });
  });
  const resetCommandCenter = () => setSettings(prev => {
    const current = mergeAppSettings(prev || {});
    return mergeAppSettings({ ...current, commandCenter:{ ...DEFAULT_APP_SETTINGS.commandCenter, professionalCalendarPinned:true } });
  });
  const updateAllCommandSections = (visible) => setSettings(prev => {
    const current = mergeAppSettings(prev || {});
    const sections = DEFAULT_COMMAND_CENTER_ORDER.reduce((acc, key) => ({ ...acc, [key]:visible }), {});
    sections.miniCalendar = true;
    return mergeAppSettings({ ...current, commandCenter:{ ...current.commandCenter, sections } });
  });
  const applyCommandPreset = (preset) => setSettings(prev => {
    const current = mergeAppSettings(prev || {});
    const presets = {
      focus:["coach", "stats", "miniCalendar", "taskCategories", "todayFocus", "lateTasks"],
      mopas:["coach", "stats", "miniCalendar", "mopasAlerts", "documentAlerts", "taskCategories", "lateTasks", "todayFocus"],
      money:["coach", "stats", "miniCalendar", "taskCategories", "goalProgress", "weeklyProgress"],
      full:DEFAULT_COMMAND_CENTER_ORDER,
    };
    const order = presets[preset] || DEFAULT_COMMAND_CENTER_ORDER;
    const sections = DEFAULT_COMMAND_CENTER_ORDER.reduce((acc, key) => ({ ...acc, [key]:order.includes(key) }), {});
    sections.miniCalendar = true;
    return mergeAppSettings({ ...current, commandCenter:{ ...current.commandCenter, sectionOrder:[...order, ...DEFAULT_COMMAND_CENTER_ORDER.filter(k => !order.includes(k))], sections, visibleCount:preset === "full" ? 12 : 8 } });
  });
  const storageSize = useMemo(() => {
    try {
      let total = 0;
      for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i) || "";
        total += key.length + String(window.localStorage.getItem(key) || "").length;
      }
      return `${(total / 1024).toFixed(1)} KB`;
    } catch { return "Unknown"; }
  }, [settings, tasks]);
  const FieldGrid = ({ children }) => <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:12 }}>{children}</div>;
  const SettingCard = ({ title, children, note }) => (
    <div style={{ ...PNL, minWidth:0 }}>
      <div style={{ color:C.gold, fontSize:11, letterSpacing:2, marginBottom:4 }}>{title}</div>
      {note && <div style={{ color:C.creamSoft, fontSize:12, marginBottom:12, lineHeight:1.5 }}>{note}</div>}
      {children}
    </div>
  );
  const Toggle = ({ label, checked, onChange }) => (
    <label style={{ display:"flex", alignItems:"center", gap:8, color:C.creamSoft, fontSize:13, marginBottom:10 }}>
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} /> {label}
    </label>
  );
  const categories = String(merged.documents.categories || "").split(",").map(x => x.trim()).filter(Boolean);
  return (
    <div style={{ display:"grid", gap:16, minWidth:0 }}>
      <div style={{ ...PNL, display:"flex", justifyContent:"space-between", gap:12, alignItems:"center", flexWrap:"wrap" }}>
        <div>
          <div style={{ color:C.gold, fontSize:11, letterSpacing:2 }}>SETTINGS</div>
          <h2 style={{ margin:"4px 0", color:C.cream }}>Workspace control center</h2>
          <div style={{ color:C.creamSoft, fontSize:13 }}>Customize routines, deadlines, documents, backup, appearance, and notifications without editing code.</div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}><Badge color={C.orange}>{merged.general.timezone}</Badge><Badge color={C.green}>Auto-saved</Badge></div>
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
        {tabs.map(name => <Btn key={name} small orange={tab === name} ghost={tab !== name} onClick={() => setTab(name)}>{name}</Btn>)}
      </div>

      {tab === "General" && <SettingCard title="GENERAL" note="Main identity and default workspace behavior.">
        <FieldGrid>
          <Input label="USER NAME" value={merged.general.userName} onChange={e => update("general", "userName", e.target.value)} />
          <Input label="ROLE / TITLE" value={merged.general.roleTitle} onChange={e => update("general", "roleTitle", e.target.value)} />
          <Input label="COMPANY NAME" value={merged.general.companyName} onChange={e => update("general", "companyName", e.target.value)} />
          <Input label="WORKSPACE NAME" value={merged.general.workspaceName} onChange={e => update("general", "workspaceName", e.target.value)} />
          <Select label="DEFAULT SPACE" options={SPACES.map(s => s.id)} value={merged.general.defaultSpace} onChange={e => update("general", "defaultSpace", e.target.value)} />
          <Input label="TIMEZONE" value={merged.general.timezone} onChange={e => update("general", "timezone", e.target.value)} />
        </FieldGrid>
        <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:12, padding:14, marginTop:12, display:"flex", alignItems:"center", gap:14 }}>
          <Logo />
          <div style={{ color:C.creamSoft, fontSize:12 }}>Logo preview. Replace the image in public folder if you want to change the actual logo file.</div>
        </div>
      </SettingCard>}

      {tab === "Daily Routine" && <SettingCard title="DAILY ROUTINE" note="Controls the daily discipline plan and automatic routine task generation.">
        <FieldGrid>
          <Input label="WAKE-UP TIME" type="time" value={merged.routine.wakeupTime} onChange={e => update("routine", "wakeupTime", e.target.value)} />
          <Input label="READING TARGET" value={merged.routine.readingTarget} onChange={e => update("routine", "readingTarget", e.target.value)} />
          <Input label="WORKOUT TIME" type="time" value={merged.routine.workoutTime} onChange={e => update("routine", "workoutTime", e.target.value)} />
          <Input label="DRAWINGBOX STUDY TIME" type="time" value={merged.routine.drawingboxTime} onChange={e => update("routine", "drawingboxTime", e.target.value)} />
          <Input label="PERSONAL PROJECT TIME" type="time" value={merged.routine.personalProjectTime} onChange={e => update("routine", "personalProjectTime", e.target.value)} />
          <Input label="AFTERGLOW BRAND TIME" type="time" value={merged.routine.afterglowBrandTime} onChange={e => update("routine", "afterglowBrandTime", e.target.value)} />
          <Input label="END DAY REVIEW TIME" type="time" value={merged.routine.endDayReviewTime} onChange={e => update("routine", "endDayReviewTime", e.target.value)} />
        </FieldGrid>
        <Toggle label="Enable automatic routine tasks" checked={merged.routine.autoRoutineTasks} onChange={v => update("routine", "autoRoutineTasks", v)} />
      </SettingCard>}

      {tab === "Tasks & Deadlines" && <SettingCard title="TASKS & DEADLINES" note="Completed tasks stay safe, visible, locked, and at the bottom. You can only collapse their display size.">
        <FieldGrid>
          <Select label="DEFAULT TASK PRIORITY" options={PRIORITIES} value={merged.tasks.defaultPriority} onChange={e => update("tasks", "defaultPriority", e.target.value)} />
          <Select label="AUTO-MOVE UNFINISHED TASKS" options={["ask first", "move automatically", "never"]} value={merged.tasks.autoMoveUnfinished} onChange={e => update("tasks", "autoMoveUnfinished", e.target.value)} />
          <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:12 }}>
            <div style={{ color:C.gold, fontSize:11, letterSpacing:1, marginBottom:4 }}>DONE TASKS</div>
            <div style={{ color:C.cream, fontSize:13, fontWeight:800 }}>Always visible · locked · bottom of the list</div>
            <div style={{ color:C.creamSoft, fontSize:11, marginTop:4 }}>Hide option removed. Use Reopen if a completed task needs work again.</div>
          </div>
          <Select label="LATE TASK BEHAVIOR" options={["move late down", "keep overdue", "move to today", "ask first"]} value={merged.tasks.overdueBehavior} onChange={e => update("tasks", "overdueBehavior", e.target.value)} />
          <Select label="WEEK START DAY" options={["Sunday", "Monday"]} value={merged.tasks.weekStartDay} onChange={e => update("tasks", "weekStartDay", e.target.value)} />
          <Input label="DEFAULT REMINDER DAYS" type="number" value={merged.tasks.defaultReminderDays} onChange={e => update("tasks", "defaultReminderDays", Number(e.target.value || 0))} />
        </FieldGrid>
        <Toggle label="Allow completed tasks inside Today Focus" checked={merged.tasks.showCompletedInFocus} onChange={v => update("tasks", "showCompletedInFocus", v)} />
      </SettingCard>}

      {tab === "Command Center" && <SettingCard title="COMMAND CENTER" note="Build your own dashboard: keep Calendar visible, choose sections, arrange order, and control how much appears before Show More. Financial Health is managed inside Money & Savings.">
        <FieldGrid>
          <Input label="SECTIONS BEFORE SHOW MORE" type="number" value={merged.commandCenter.visibleCount || 8} onChange={e => update("commandCenter", "visibleCount", Number(e.target.value || 1))} />
          <Select label="COMMAND CENTER LAYOUT" options={["compact", "balanced", "wide"]} value={merged.commandCenter.layout || "balanced"} onChange={e => update("commandCenter", "layout", e.target.value)} />
          <Select label="CARD DENSITY" options={["compact", "comfortable"]} value={merged.commandCenter.density || "comfortable"} onChange={e => update("commandCenter", "density", e.target.value)} />
        </FieldGrid>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:10, marginTop:8 }}>
          <Toggle label="Show section numbers" checked={merged.commandCenter.showSectionNumbers !== false} onChange={v => update("commandCenter", "showSectionNumbers", v)} />
          <Toggle label="Show Command Center status bar" checked={merged.commandCenter.showStatusBar !== false} onChange={v => update("commandCenter", "showStatusBar", v)} />
          <Toggle label="Start dashboard expanded" checked={merged.commandCenter.defaultExpanded === true} onChange={v => update("commandCenter", "defaultExpanded", v)} />
        </div>
        <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:14, padding:14, margin:"12px 0", color:C.creamSoft, fontSize:12, lineHeight:1.55 }}>
          <strong style={{ color:C.gold }}>Calendar is protected:</strong> the full Calendar tab stays in every workspace and the dashboard Calendar card is kept visible by default. TODAY DISCIPLINE PLAN stays above everything and is not hidden.
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", marginBottom:12 }}>
          <Btn small orange onClick={() => applyCommandPreset("focus")}>Focus Preset</Btn>
          <Btn small ghost onClick={() => applyCommandPreset("mopas")}>MOPAS Preset</Btn>
          <Btn small ghost onClick={() => applyCommandPreset("money")}>Money Preset</Btn>
          <Btn small ghost onClick={() => applyCommandPreset("full")}>Full Dashboard</Btn>
          <Btn small ghost onClick={() => updateAllCommandSections(true)}>Show All</Btn>
          <Btn small ghost onClick={() => updateAllCommandSections(false)}>Hide Optional</Btn>
          <Btn small ghost onClick={resetCommandCenter}>Reset Professional Layout</Btn>
        </div>
        <div style={{ display:"grid", gap:8 }}>
          {(merged.commandCenter.sectionOrder || DEFAULT_COMMAND_CENTER_ORDER).map((key, index) => {
            const info = COMMAND_CENTER_SECTIONS.find(item => item.key === key) || { key, label:key, group:"Custom" };
            const isCalendar = key === "miniCalendar";
            return (
              <div key={key} style={{ display:"grid", gridTemplateColumns:"minmax(0, 1fr) auto auto auto", gap:8, alignItems:"center", background:C.bg, border:"1px solid "+(isCalendar ? C.gold : C.border), borderLeft:"4px solid "+(isCalendar ? C.gold : C.border), borderRadius:12, padding:10 }}>
                <label style={{ display:"flex", alignItems:"center", gap:8, color:C.cream, fontSize:13, fontWeight:800, minWidth:0 }}>
                  <input type="checkbox" disabled={isCalendar} checked={isCalendar ? true : merged.commandCenter.sections?.[key] !== false} onChange={e => updateCommandSection(key, e.target.checked)} />
                  <span style={{ whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{index + 1}. {info.label}</span>
                </label>
                <Badge color={isCalendar ? C.gold : merged.commandCenter.sections?.[key] !== false ? C.green : C.muted}>{isCalendar ? "Protected" : merged.commandCenter.sections?.[key] !== false ? "Visible" : "Hidden"}</Badge>
                <Badge color={C.blue}>{info.group || "Section"}</Badge>
                <div style={{ display:"flex", gap:6, justifyContent:"flex-end", flexWrap:"wrap" }}>
                  <Btn small ghost disabled={index === 0} onClick={() => moveCommandSection(key, -1)}>↑</Btn>
                  <Btn small ghost disabled={index === (merged.commandCenter.sectionOrder || DEFAULT_COMMAND_CENTER_ORDER).length - 1} onClick={() => moveCommandSection(key, 1)}>↓</Btn>
                </div>
              </div>
            );
          })}
        </div>
      </SettingCard>}

      {tab === "MOPAS Tender" && <SettingCard title="MOPAS TENDER" note="Tender preparation defaults for MOPAS tracking and dashboard urgency.">
        <FieldGrid>
          <Input label="TENDER ROOT FOLDER PATH" value={merged.mopas.tenderRootPath} onChange={e => update("mopas", "tenderRootPath", e.target.value)} />
          <Input label="TENDER DEADLINE WARNING DAYS" type="number" value={merged.mopas.tenderDeadlineWarningDays} onChange={e => update("mopas", "tenderDeadlineWarningDays", Number(e.target.value || 0))} />
          <Input label="HIGH-VALUE TENDER THRESHOLD" type="number" value={merged.mopas.highValueTenderThreshold} onChange={e => update("mopas", "highValueTenderThreshold", Number(e.target.value || 0))} />
        </FieldGrid>
        <Textarea label="DEFAULT TENDER STAGES" value={merged.mopas.defaultTenderStages} onChange={e => update("mopas", "defaultTenderStages", e.target.value)} />
        <Textarea label="DEFAULT REQUIRED DOCUMENTS" value={merged.mopas.defaultRequiredDocuments} onChange={e => update("mopas", "defaultRequiredDocuments", e.target.value)} />
        <Toggle label="Enable tender urgency on dashboard" checked={merged.mopas.tenderUrgencyOnDashboard} onChange={v => update("mopas", "tenderUrgencyOnDashboard", v)} />
      </SettingCard>}

      {tab === "Documents" && <SettingCard title="DOCUMENTS" note="Google Drive upload uses Apps Script endpoint. Without URL, files are saved as local metadata only.">
        <FieldGrid>
          <Input label="EXPIRY WARNING DAYS" type="number" value={merged.documents.expiryWarningDays} onChange={e => update("documents", "expiryWarningDays", Number(e.target.value || 0))} />
          <Input label="DEFAULT DOCUMENT OWNER" value={merged.documents.defaultOwner} onChange={e => update("documents", "defaultOwner", e.target.value)} />
          <Input label="GOOGLE DRIVE FOLDER ID" value={merged.documents.googleDriveFolderId} onChange={e => update("documents", "googleDriveFolderId", e.target.value)} />
          <Input label="GOOGLE APPS SCRIPT UPLOAD URL" value={merged.documents.googleAppsScriptUploadUrl} onChange={e => update("documents", "googleAppsScriptUploadUrl", e.target.value)} placeholder="Paste deployed Apps Script Web App URL" />
        </FieldGrid>
        <Textarea label="DOCUMENT CATEGORIES" value={merged.documents.categories} onChange={e => update("documents", "categories", e.target.value)} />
        <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:12, margin:"10px 0", color:C.creamSoft, fontSize:12, lineHeight:1.55 }}>
          <div style={{ color:C.gold, fontSize:11, letterSpacing:1.5, marginBottom:5 }}>GOOGLE DRIVE CONNECTION</div>
          <div>Folder ID is saved. File upload needs a deployed Google Apps Script Web App URL. Without that URL, the app will safely save document metadata locally and will not crash.</div>
          <div style={{ marginTop:6 }}>Current status: {merged.documents.googleAppsScriptUploadUrl ? "Connected to Apps Script URL" : "Local-only until Apps Script URL is added"}</div>
        </div>
        <Toggle label="Show expired documents on dashboard" checked={merged.documents.showExpiredOnDashboard} onChange={v => update("documents", "showExpiredOnDashboard", v)} />
        <Toggle label="Auto-highlight expired documents" checked={merged.documents.autoHighlightExpired} onChange={v => update("documents", "autoHighlightExpired", v)} />
        <div style={{ color:C.creamSoft, fontSize:12 }}>Current categories: {categories.join(" · ") || "None"}</div>
      </SettingCard>}

      {tab === "Backup & Data" && <SettingCard title="BACKUP & DATA" note="Protect localStorage data before large changes.">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:10, marginBottom:12 }}>
          <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:12 }}><div style={{ color:C.green, fontSize:22, fontWeight:900 }}>{tasks.length}</div><div style={{ color:C.creamSoft, fontSize:11 }}>Tasks saved</div></div>
          <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:12 }}><div style={{ color:C.blue, fontSize:22, fontWeight:900 }}>{readStore(DOCUMENTS_KEY, []).length}</div><div style={{ color:C.creamSoft, fontSize:11 }}>Documents saved</div></div>
          <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:12 }}><div style={{ color:C.gold, fontSize:22, fontWeight:900 }}>{storageSize}</div><div style={{ color:C.creamSoft, fontSize:11 }}>Storage health</div></div>
        </div>
        <FieldGrid>
          <Select label="AUTO-BACKUP REMINDER" options={["daily", "weekly", "monthly", "off"]} value={merged.backup.autoBackupReminder} onChange={e => update("backup", "autoBackupReminder", e.target.value)} />
        </FieldGrid>
        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginTop:8 }}>
          <Btn orange onClick={exportBackup}>Export Full JSON Backup</Btn>
          <label style={{ padding:"8px 18px", borderRadius:8, border:"1px solid "+C.border, cursor:"pointer", background:"transparent", color:C.cream, fontSize:13, fontWeight:600 }}>
            Import JSON Backup
            <input type="file" accept="application/json,.json" onChange={importBackup} style={{ display:"none" }} />
          </label>
          <Btn ghost onClick={resetSettingsOnly}>Reset Settings Only</Btn>
          <Btn ghost onClick={clearTestData} style={{ color:C.red, borderColor:C.red }}>Clear Test Data</Btn>
        </div>
      </SettingCard>}

      {tab === "Appearance" && <SettingCard title="APPEARANCE" note="Customize the workspace look. These options save immediately and apply live.">
        <FieldGrid>
          <Select label="THEME" options={["dark", "darker"]} value={merged.appearance.theme} onChange={e => update("appearance", "theme", e.target.value)} />
          <Select label="ACCENT COLOR" options={["orange", "gold", "blue", "green", "purple"]} value={merged.appearance.accentColor} onChange={e => update("appearance", "accentColor", e.target.value)} />
          <Select label="CARD DENSITY" options={["comfortable", "compact"]} value={merged.appearance.cardDensity} onChange={e => update("appearance", "cardDensity", e.target.value)} />
          <Select label="PANEL SPACING" options={["normal", "tight", "wide"]} value={merged.appearance.panelSpacing || "normal"} onChange={e => update("appearance", "panelSpacing", e.target.value)} />
          <Select label="FONT SIZE" options={["small", "normal", "large"]} value={merged.appearance.fontSize || "normal"} onChange={e => update("appearance", "fontSize", e.target.value)} />
          <Select label="BORDER RADIUS" options={["soft", "rounded", "extra rounded"]} value={merged.appearance.borderRadius || "rounded"} onChange={e => update("appearance", "borderRadius", e.target.value)} />
          <Select label="SIDEBAR BEHAVIOR" options={["auto", "always open", "collapsed"]} value={merged.appearance.sidebarBehavior} onChange={e => update("appearance", "sidebarBehavior", e.target.value)} />
          <Select label="LOGO SIZE" options={["small", "medium", "large"]} value={merged.appearance.logoSize} onChange={e => { update("appearance", "logoSize", e.target.value); update("general", "logoSize", e.target.value); }} />
          <Input label="DASHBOARD ICON" value={merged.appearance.dashboardIcon || "▨"} onChange={e => update("appearance", "dashboardIcon", e.target.value)} />
          <Input label="DASHBOARD NAME" value={merged.appearance.dashboardLabel || "Command Center"} onChange={e => update("appearance", "dashboardLabel", e.target.value)} />
        </FieldGrid>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:8, marginTop:4 }}>
          <Toggle label="Compact mode" checked={merged.appearance.compactMode} onChange={v => update("appearance", "compactMode", v)} />
          <Toggle label="Show workspace profile card" checked={merged.appearance.workspaceCard !== false} onChange={v => update("appearance", "workspaceCard", v)} />
          <Toggle label="Show task counts in sidebar" checked={merged.appearance.showTaskCounts !== false} onChange={v => update("appearance", "showTaskCounts", v)} />
        </div>
        <div style={{ marginTop:12, display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(180px, 1fr))", gap:10 }}>
          <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:C.radius || 12, padding:12 }}>
            <div style={{ color:C.gold, fontSize:10, letterSpacing:1.5 }}>LIVE PREVIEW</div>
            <div style={{ color:C.cream, fontWeight:900, marginTop:4 }}>{merged.appearance.dashboardIcon || "▨"} {merged.appearance.dashboardLabel || "Command Center"}</div>
            <div style={{ color:C.creamSoft, fontSize:12, marginTop:4 }}>Theme: {merged.appearance.theme} · Accent: {merged.appearance.accentColor} · Font: {merged.appearance.fontSize || "normal"}</div>
          </div>
          <div style={{ background:C.elevated, border:"1px solid "+C.orange, borderRadius:C.radius || 12, padding:12 }}>
            <div style={{ color:C.orange, fontSize:10, letterSpacing:1.5 }}>LAYOUT</div>
            <div style={{ color:C.cream, fontWeight:900, marginTop:4 }}>{merged.appearance.sidebarBehavior}</div>
            <div style={{ color:C.creamSoft, fontSize:12, marginTop:4 }}>Density: {merged.appearance.cardDensity} · Spacing: {merged.appearance.panelSpacing || "normal"} · Radius: {merged.appearance.borderRadius || "rounded"}</div>
          </div>
        </div>
      </SettingCard>}

      {tab === "Notifications" && <SettingCard title="EMAIL NOTIFICATIONS" note="The email now sends a short current-action message based on the time of day and the active task/block.">
        <FieldGrid>
          <Input label="EMAIL ADDRESS" value={merged.notifications.emailAddress} onChange={e => update("notifications", "emailAddress", e.target.value)} />
          <Input label="GOOGLE APPS SCRIPT EMAIL URL" value={merged.notifications.googleAppsScriptEmailUrl} onChange={e => update("notifications", "googleAppsScriptEmailUrl", e.target.value)} placeholder="Paste Apps Script Web App URL ending with /exec" />
          <Select label="NOTIFICATION METHOD" options={["Email", "Browser", "WhatsApp later"]} value={merged.notifications.method} onChange={e => update("notifications", "method", e.target.value)} />
          <Input label="SEND TIME" type="time" value={merged.notifications.todayDisciplineEmailTime} onChange={e => update("notifications", "todayDisciplineEmailTime", e.target.value)} />
          <Select label="EMAIL MODE" options={["Current action only", "Morning plan", "Full report"]} value={merged.notifications.emailMode || "Current action only"} onChange={e => update("notifications", "emailMode", e.target.value)} />
          <Select label="EMAIL TONE" options={["Direct", "Strict", "Motivational"]} value={merged.notifications.emailTone || "Direct"} onChange={e => update("notifications", "emailTone", e.target.value)} />
          <Input label="ACTION WINDOW MINUTES" type="number" value={merged.notifications.actionWindowMinutes || 60} onChange={e => update("notifications", "actionWindowMinutes", Number(e.target.value || 60))} />
          <Input label="EMAIL SUBJECT PREFIX" value={merged.notifications.emailSubjectPrefix || "AFTERGLOW"} onChange={e => update("notifications", "emailSubjectPrefix", e.target.value)} />
        </FieldGrid>
        <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:C.radius || 10, padding:12, margin:"10px 0", color:C.creamSoft, fontSize:12, lineHeight:1.55 }}>
          <div style={{ color:C.gold, fontSize:11, letterSpacing:1.5, marginBottom:5 }}>CURRENT ACTION EMAIL</div>
          <div>The email will now focus on one active action: what to do now, start time, space, urgency, why it matters, and up to 3 next steps. Full schedules and long reports are no longer included by default.</div>
          <div style={{ marginTop:6 }}>Endpoint status: {(merged.notifications.googleAppsScriptEmailUrl || merged.documents.googleAppsScriptUploadUrl) ? "Ready to send through Apps Script" : "Missing Apps Script URL"}</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(240px, 1fr))", gap:8, marginBottom:10 }}>
          <Toggle label="Enable email notifications" checked={merged.notifications.emailNotifications} onChange={v => update("notifications", "emailNotifications", v)} />
          <Toggle label="Send current action email automatically" checked={merged.notifications.todayDisciplineEmail} onChange={v => update("notifications", "todayDisciplineEmail", v)} />
          <Toggle label="Show task start time" checked={merged.notifications.includeTaskStartTimes !== false} onChange={v => update("notifications", "includeTaskStartTimes", v)} />
          <Toggle label="Include why it matters" checked={merged.notifications.includeWhyInEmail !== false} onChange={v => update("notifications", "includeWhyInEmail", v)} />
          <Toggle label="Include next block" checked={merged.notifications.includeNextBlock !== false} onChange={v => update("notifications", "includeNextBlock", v)} />
          <Toggle label="Include routine progress" checked={merged.notifications.includeRoutineProgressInCurrentEmail !== false} onChange={v => update("notifications", "includeRoutineProgressInCurrentEmail", v)} />
          <Toggle label="Include short late-task warning" checked={merged.notifications.includeLateWarningInCurrentEmail !== false} onChange={v => update("notifications", "includeLateWarningInCurrentEmail", v)} />
          <Toggle label="Include document warning" checked={merged.notifications.includeDocumentAlertInCurrentEmail} onChange={v => update("notifications", "includeDocumentAlertInCurrentEmail", v)} />
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          <Btn orange onClick={() => sendTodayDisciplineEmail && sendTodayDisciplineEmail({ manual:true })}>Send Current Action Email Now</Btn>
          <Btn ghost onClick={() => update("notifications", "googleAppsScriptEmailUrl", merged.documents.googleAppsScriptUploadUrl || "")}>Use Drive Upload URL</Btn>
        </div>
        {emailNotice && <div style={{ marginTop:10, color: emailNotice.type === "success" ? C.green : emailNotice.type === "error" ? C.red : C.gold, fontSize:12, lineHeight:1.5 }}>{emailNotice.message}</div>}
        <div style={{ color:C.muted, fontSize:11, marginTop:10, lineHeight:1.5 }}>Automatic email sends once per day when the app is open after the selected time. For closed-app automation, use an Apps Script trigger later.</div>
      </SettingCard>}
    </div>
  );
}

function DocumentsView({ activeSpace, settings }) {

  const refreshCloudTasks = useCallback(async () => {
    if (!getStoredAuthToken()) {
      setBackendNotice({ type:"error", message:"Login first before syncing from backend." });
      return;
    }
    setBackendBusy(true);
    setBackendNotice({ type:"info", message:"Syncing tasks from MongoDB..." });
    try {
      const result = await afterglowApiRequest("/api/tasks?limit=500");
      const cloudTasks = (result.data || []).map(taskFromApi);
      setTasks(prev => ensureRoutineTasksForDate(mergeCloudTasks(prev, cloudTasks), localTodayISO()).map(normalizeTask));
      setBackendNotice({ type:"success", message:`Synced ${cloudTasks.length} cloud task${cloudTasks.length === 1 ? "" : "s"}.` });
    } catch (error) {
      if (error?.status === 401) {
        setStoredAuth("", null);
        setAuth({ token:"", user:null });
        setAutoSyncDone(false);
        setBackendNotice({ type:"error", message:"Session expired. Please login again." });
      } else {
        setBackendNotice({ type:"error", message:String(error?.message || error) });
      }
    } finally {
      setBackendBusy(false);
    }
  }, []);

  const handleBackendLogin = useCallback(async (payload) => {
    setBackendBusy(true);
    setBackendNotice({ type:"info", message:"Logging in to AFTERGLOW backend..." });
    try {
      const result = await afterglowApiRequest("/api/auth/login", { method:"POST", body:JSON.stringify(payload) });
      setStoredAuth(result.token, result.user);
      setAuth({ token:result.token, user:result.user });
      setBackendNotice({ type:"success", message:"Backend connected. Loading cloud tasks..." });
      const taskResult = await afterglowApiRequest("/api/tasks?limit=500");
      const cloudTasks = (taskResult.data || []).map(taskFromApi);
      setTasks(prev => ensureRoutineTasksForDate(mergeCloudTasks(prev, cloudTasks), localTodayISO()).map(normalizeTask));
      setAutoSyncDone(true);
      setBackendNotice({ type:"success", message:`Connected as ${result.user?.name || "user"}. ${cloudTasks.length} cloud task${cloudTasks.length === 1 ? "" : "s"} loaded.` });
    } catch (error) {
      setBackendNotice({ type:"error", message:String(error?.message || error) });
    } finally {
      setBackendBusy(false);
    }
  }, []);

  const handleBackendRegister = useCallback(async (payload) => {
    setBackendBusy(true);
    setBackendNotice({ type:"info", message:"Creating backend account..." });
    try {
      const result = await afterglowApiRequest("/api/auth/register", { method:"POST", body:JSON.stringify(payload) });
      setStoredAuth(result.token, result.user);
      setAuth({ token:result.token, user:result.user });
      setBackendNotice({ type:"success", message:"Account created. Loading cloud tasks..." });
      const taskResult = await afterglowApiRequest("/api/tasks?limit=500");
      const cloudTasks = (taskResult.data || []).map(taskFromApi);
      setTasks(prev => ensureRoutineTasksForDate(mergeCloudTasks(prev, cloudTasks), localTodayISO()).map(normalizeTask));
      setAutoSyncDone(true);
      setBackendNotice({ type:"success", message:`Account created for ${result.user?.name || "user"}. ${cloudTasks.length} cloud task${cloudTasks.length === 1 ? "" : "s"} loaded.` });
    } catch (error) {
      setBackendNotice({ type:"error", message:String(error?.message || error) });
    } finally {
      setBackendBusy(false);
    }
  }, []);

  const handleBackendLogout = useCallback(() => {
    setStoredAuth("", null);
    setAuth({ token:"", user:null });
    setAutoSyncDone(false);
    setBackendNotice({ type:"info", message:"Logged out from backend. Local data remains available." });
  }, []);

  const uploadLocalTasksToCloud = useCallback(async () => {
    if (!getStoredAuthToken()) {
      setBackendNotice({ type:"error", message:"Login first before uploading local tasks." });
      return;
    }
    const localOnly = tasks.map(normalizeTask).filter(task => !getTaskCloudId(task));
    if (!localOnly.length) {
      setBackendNotice({ type:"success", message:"All visible tasks already have cloud IDs." });
      return;
    }
    setBackendBusy(true);
    setBackendNotice({ type:"info", message:`Uploading ${localOnly.length} local task${localOnly.length === 1 ? "" : "s"} to MongoDB...` });
    try {
      const uploaded = [];
      for (const task of localOnly) {
        const result = await afterglowApiRequest("/api/tasks", { method:"POST", body:JSON.stringify(taskPayloadForApi(task)) });
        if (result.data) uploaded.push(taskFromApi(result.data));
      }
      setTasks(prev => mergeCloudTasks(prev, uploaded));
      setBackendNotice({ type:"success", message:`Uploaded ${uploaded.length} task${uploaded.length === 1 ? "" : "s"} to MongoDB.` });
    } catch (error) {
      setBackendNotice({ type:"error", message:String(error?.message || error) });
    } finally {
      setBackendBusy(false);
    }
  }, [tasks]);

  const sp = SPACES.find(s => s.id === activeSpace) || SPACES[0];
  const docSettings = mergeAppSettings(settings).documents;
  const configuredCategories = String(docSettings.categories || "Company, Tender, Staff, Contract, Finance").split(",").map(x => x.trim()).filter(Boolean);
  const initialCategory = configuredCategories[0] || sp.folders[0] || "General";
  const emptyDocumentForm = { title:"", category:initialCategory, owner:docSettings.defaultOwner || "MOPAS", path:"", note:"", hasExpiry:false, expiryDate:"", fileName:"", fileType:"", fileSize:0 };
  const [documents, setDocuments] = useState(() => readStore(DOCUMENTS_KEY, []));
  const [form, setForm] = useState(emptyDocumentForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileMessage, setFileMessage] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [docSearch, setDocSearch] = useState("");

  useEffect(() => {
    const category = configuredCategories[0] || (SPACES.find(s => s.id === activeSpace)?.folders || ["General"])[0] || "General";
    setForm(f => ({ ...f, category, owner:docSettings.defaultOwner || f.owner || "MOPAS" }));
    setFileMessage("");
  }, [activeSpace, docSettings.defaultOwner, docSettings.categories]);

  const set = (k, v) => setForm(f => ({ ...f, [k]:v }));
  const saveDocuments = (next) => {
    setDocuments(next);
    writeStore(DOCUMENTS_KEY, next);
  };
  const formatBytes = (bytes) => {
    const value = Number(bytes || 0);
    if (!value) return "-";
    if (value < 1024) return value + " B";
    if (value < 1024 * 1024) return (value / 1024).toFixed(1) + " KB";
    return (value / (1024 * 1024)).toFixed(1) + " MB";
  };
  const fileToDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setForm(f => ({ ...f, title:f.title || file.name, path:f.path || file.name, note:f.note || "Selected file: " + file.name, fileName:file.name, fileType:file.type || "application/octet-stream", fileSize:file.size || 0 }));
    setFileMessage("File selected. It will upload to Google Drive only when Apps Script URL is configured.");
  };
  const uploadToDrive = async (file, metadata) => {
    const uploadUrl = String(docSettings.googleAppsScriptUploadUrl || "").trim();
    if (!uploadUrl || !file) return { uploadStatus:"Local Only", uploadMessage:"Drive upload URL is missing. The document record was saved locally. Add your Apps Script Web App URL in Settings → Documents to upload files to Drive." };
    if (!uploadUrl.includes("script.google.com/macros/s/") || !uploadUrl.endsWith("/exec")) {
      return { uploadStatus:"Failed", uploadMessage:"Invalid Apps Script URL. Use the deployed Web App URL ending with /exec, not the edit URL or /dev test URL." };
    }
    if (file.size > 25 * 1024 * 1024) {
      return { uploadStatus:"Failed", uploadMessage:"File is too large for this simple Apps Script uploader. Try a file under 25 MB or upload the file manually to Drive and save the link." };
    }
    try {
      const dataUrl = await fileToDataUrl(file);
      const base64 = String(dataUrl).split(",")[1] || "";
      const payload = {
        folderId:docSettings.googleDriveFolderId || DEFAULT_DRIVE_FOLDER_ID,
        fileName:file.name,
        mimeType:file.type || "application/octet-stream",
        data:base64,
        document:metadata,
      };
      const response = await fetch(uploadUrl, {
        method:"POST",
        redirect:"follow",
        headers:{ "Content-Type":"text/plain;charset=utf-8" },
        body:JSON.stringify(payload),
      });
      const raw = await response.text();
      let result = {};
      try { result = raw ? JSON.parse(raw) : {}; } catch { result = { success:false, message:raw || "Apps Script returned an unreadable response." }; }
      const fileUrl = result.fileUrl || result.url || result.webViewLink || result.driveUrl || "";
      if (!response.ok || !fileUrl || result.success === false) return { uploadStatus:"Failed", uploadMessage:result.message || `Google Drive upload failed (${response.status}). Metadata saved locally.` };
      return { uploadStatus:"Uploaded", uploadMessage:"Uploaded to Google Drive successfully.", driveFileUrl:fileUrl, driveFileId:result.fileId || result.id || "" };
    } catch (error) {
      const message = String(error && error.message ? error.message : error);
      return { uploadStatus:"Failed", uploadMessage:`Google Drive upload failed: ${message}. Check Web App deployment permissions and use the /exec URL.` };
    }
  };
  const addDocument = async () => {
    if (!form.title.trim() && !form.path.trim() && !form.fileName) return;
    setUploadBusy(true);
    const baseDoc = {
      id: "DOC-" + Date.now(),
      space: activeSpace,
      title: form.title.trim() || form.fileName || "Untitled document",
      category: form.category || "General",
      owner: form.owner || docSettings.defaultOwner || "MOPAS",
      path: form.path.trim(),
      note: form.note.trim(),
      uploadDate: todayISO(),
      hasExpiry: !!form.hasExpiry,
      expiryDate: form.hasExpiry ? form.expiryDate : "",
      fileName: form.fileName || "",
      fileType: form.fileType || "",
      fileSize: form.fileSize || 0,
      googleDriveFolderId: docSettings.googleDriveFolderId || DEFAULT_DRIVE_FOLDER_ID,
      driveFileUrl:"",
      driveFileId:"",
      uploadStatus: selectedFile ? "Uploading" : "Local Only",
      uploadMessage: selectedFile ? "Uploading..." : "No file selected. Metadata saved locally.",
    };
    let finalDoc = baseDoc;
    try {
      const uploadResult = await uploadToDrive(selectedFile, baseDoc);
      finalDoc = { ...baseDoc, ...uploadResult };
      setFileMessage(uploadResult.uploadMessage || "Document saved.");
    } catch (error) {
      const errMessage = String(error && error.message ? error.message : error);
      finalDoc = { ...baseDoc, uploadStatus:"Failed", uploadMessage:"Google Drive upload failed: " + errMessage };
      setFileMessage("Google Drive upload failed: " + errMessage);
    }
    const next = [finalDoc, ...documents];
    saveDocuments(next);
    setForm({ ...emptyDocumentForm, category:configuredCategories[0] || initialCategory, owner:docSettings.defaultOwner || "MOPAS" });
    setSelectedFile(null);
    setUploadBusy(false);
  };
  const deleteDocument = (id) => {
    const next = documents.filter(d => d.id !== id);
    saveDocuments(next);
  };
  const docsWithStatus = documents
    .filter(d => d.space === activeSpace)
    .map(doc => ({ ...doc, statusInfo:getDocumentStatus(doc, docSettings.expiryWarningDays) }));
  const filteredDocs = docsWithStatus.filter(doc => {
    const categoryOk = filterCategory === "All" || doc.category === filterCategory;
    const statusOk = filterStatus === "All" || doc.statusInfo.label === filterStatus || doc.uploadStatus === filterStatus;
    const searchOk = [doc.title, doc.fileName, doc.category, doc.owner, doc.note].join(" ").toLowerCase().includes(docSearch.toLowerCase());
    return categoryOk && statusOk && searchOk;
  }).sort((a, b) => String(a.expiryDate || "9999-12-31").localeCompare(String(b.expiryDate || "9999-12-31")) || String(b.uploadDate || "").localeCompare(String(a.uploadDate || "")));
  const countdownText = (doc) => {
    const days = doc.statusInfo.daysLeft;
    if (days === null || days === undefined) return "No expiry date";
    if (days < 0) return `${Math.abs(days)} day(s) expired`;
    if (days === 0) return "Expires today";
    return `${days} day(s) left`;
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"minmax(280px, 380px) minmax(0, 1fr)", gap:18, alignItems:"start" }}>
      <div style={PNL}>
        <div style={{ color:C.gold, fontSize:11, letterSpacing:2, marginBottom:4 }}>ADD DOCUMENT</div>
        <div style={{ color:C.creamSoft, fontSize:12, marginBottom:12 }}>Default Drive folder: {docSettings.googleDriveFolderId || DEFAULT_DRIVE_FOLDER_ID}</div>
        <Input label="DOCUMENT TITLE" value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. RRA Tax Clearance" />
        <Select label="CATEGORY" options={configuredCategories.length ? configuredCategories : [initialCategory]} value={form.category} onChange={e => set("category", e.target.value)} />
        <Input label="OWNER" value={form.owner} onChange={e => set("owner", e.target.value)} placeholder="MOPAS / Samuel / Finance" />
        <Input label="SELECT FILE" type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.zip,image/*,application/pdf,application/zip" onChange={handleFile} />
        {form.fileName && (
          <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:8, padding:10, marginBottom:12 }}>
            <div style={{ color:C.cream, fontSize:12, fontWeight:700, wordBreak:"break-word" }}>{form.fileName}</div>
            <div style={{ color:C.creamSoft, fontSize:11, marginTop:3 }}>{form.fileType || "Unknown type"} · {formatBytes(form.fileSize)}</div>
            {fileMessage && <div style={{ color:fileMessage.includes("failed") ? C.red : fileMessage.includes("not connected") ? C.orange : C.gold, fontSize:11, marginTop:6 }}>{fileMessage}</div>}
          </div>
        )}
        <Input label="LOCAL DISK PATH / REFERENCE" value={form.path} onChange={e => set("path", e.target.value)} placeholder={'e.g. D:\\PROJECT\\TENDER PREP\\...'} />
        <Textarea label="NOTES" value={form.note} onChange={e => set("note", e.target.value)} placeholder="Document note or reminder..." />
        <label style={{ display:"flex", alignItems:"center", gap:8, color:C.creamSoft, fontSize:13, margin:"6px 0 12px" }}>
          <input type="checkbox" checked={form.hasExpiry} onChange={e => set("hasExpiry", e.target.checked)} />
          This document has expiry date
        </label>
        {form.hasExpiry && <Input label="EXPIRY DATE" type="date" value={form.expiryDate} onChange={e => set("expiryDate", e.target.value)} />}
        <Btn orange onClick={addDocument} disabled={uploadBusy || (!form.title.trim() && !form.path.trim() && !form.fileName)}>{uploadBusy ? "Saving..." : "Save / Upload Document"}</Btn>
        {!docSettings.googleAppsScriptUploadUrl && <div style={{ color:C.orange, fontSize:11, marginTop:10, lineHeight:1.5 }}>Drive upload URL is missing. The document record was saved locally. Add your Apps Script Web App URL in Settings → Documents to upload files to Drive.</div>}
      </div>

      <div style={PNL}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, gap:10, flexWrap:"wrap" }}>
          <div>
            <div style={{ color:C.gold, fontSize:11, letterSpacing:2 }}>DOCUMENT MANAGER</div>
            <div style={{ color:C.creamSoft, fontSize:12 }}>{sp.name} documents, expiry status, and Drive links.</div>
          </div>
          <Badge color={sp.color}>{filteredDocs.length}/{docsWithStatus.length} files</Badge>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))", gap:8, marginBottom:12 }}>
          <input value={docSearch} onChange={e => setDocSearch(e.target.value)} placeholder="Search documents..." style={{ padding:"9px 10px", borderRadius:8, border:"1px solid "+C.border, background:C.bg, color:C.cream, outline:"none" }} />
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding:"9px 10px", borderRadius:8, border:"1px solid "+C.border, background:C.bg, color:C.cream }}>
            {["All", ...configuredCategories].map(x => <option key={x} value={x}>{x}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ padding:"9px 10px", borderRadius:8, border:"1px solid "+C.border, background:C.bg, color:C.cream }}>
            {["All", "Active", "Expiring Soon", "Expired", "Uploaded", "Failed", "Local Only"].map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        {!filteredDocs.length && <div style={{ color:C.muted, textAlign:"center", padding:35 }}>No documents match this view.</div>}
        <div style={{ display:"grid", gap:10 }}>
          {filteredDocs.map(doc => {
            const st = doc.statusInfo;
            const uploadColor = doc.uploadStatus === "Uploaded" ? C.green : doc.uploadStatus === "Failed" ? C.red : doc.uploadStatus === "Uploading" ? C.gold : C.orange;
            return (
              <div key={doc.id} style={{ background:C.bg, border:"1px solid "+(st.label === "Expired" ? C.red : C.border), borderLeft:"5px solid "+st.color, borderRadius:10, padding:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"flex-start", flexWrap:"wrap" }}>
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontWeight:800, color:st.label === "Expired" ? C.red : C.cream, fontSize:14, wordBreak:"break-word" }}>{doc.title}</div>
                    <div style={{ color:C.muted, fontSize:11, marginTop:4 }}>{doc.category} · Owner: {doc.owner || "-"} · Uploaded: {doc.uploadDate}</div>
                    <div style={{ color:C.creamSoft, fontSize:12, marginTop:7 }}>{countdownText(doc)}</div>
                  </div>
                  <div style={{ display:"flex", gap:6, alignItems:"center", flexWrap:"wrap", justifyContent:"flex-end" }}>
                    <Badge color={st.color}>{st.label}</Badge>
                    <Badge color={uploadColor}>{doc.uploadStatus || "Local Only"}</Badge>
                    {doc.driveFileUrl && <Btn small orange onClick={() => window.open(doc.driveFileUrl, "_blank", "noopener,noreferrer")}>Open File</Btn>}
                    <Btn small ghost onClick={() => deleteDocument(doc.id)} style={{ color:C.red, borderColor:C.red }}>Delete</Btn>
                  </div>
                </div>
                {(doc.fileName || doc.fileType || doc.fileSize) && <div style={{ color:C.creamSoft, fontSize:12, marginTop:8, wordBreak:"break-word" }}>File: {doc.fileName || "Saved file"} {doc.fileType ? "· " + doc.fileType : ""} {doc.fileSize ? "· " + formatBytes(doc.fileSize) : ""}</div>}
                {doc.path && <div style={{ color:C.creamSoft, fontSize:12, marginTop:6, wordBreak:"break-word" }}>Path: {doc.path}</div>}
                {doc.hasExpiry && doc.expiryDate && <div style={{ color:C.creamSoft, fontSize:12, marginTop:4 }}>Expiry: {doc.expiryDate}</div>}
                {doc.googleDriveFolderId && <div style={{ color:C.muted, fontSize:11, marginTop:4, wordBreak:"break-word" }}>Drive folder: {doc.googleDriveFolderId}</div>}
                {doc.uploadMessage && <div style={{ color:uploadColor, fontSize:11, marginTop:8 }}>{doc.uploadMessage}</div>}
                {doc.note && <div style={{ color:C.creamSoft, fontSize:12, marginTop:8, lineHeight:1.5 }}>{doc.note}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DailyReportView() {
  const [reports, setReports] = useState(() => readStore(DAILY_REPORT_KEY, []));
  const [form, setForm] = useState({ date:todayISO(), completed:"", pending:"", tomorrow:"", opportunity:"", followups:"", notes:"" });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]:e.target.value }));
  const saveReport = () => {
    const hasContent = ["completed","pending","tomorrow","opportunity","followups","notes"].some(k => form[k].trim());
    if (!hasContent) return;
    const report = { ...form, id:"REP-" + Date.now(), createdAt:new Date().toLocaleString() };
    const next = [report, ...reports];
    setReports(next);
    writeStore(DAILY_REPORT_KEY, next);
    setForm({ date:todayISO(), completed:"", pending:"", tomorrow:"", opportunity:"", followups:"", notes:"" });
  };
  const deleteReport = (id) => {
    const next = reports.filter(r => r.id !== id);
    setReports(next);
    writeStore(DAILY_REPORT_KEY, next);
  };
  const exportReport = (r) => {
    const body = `<h1>MOPAS Daily Operation Report</h1><div class="meta">Date: ${escapeHtml(r.date)} · Created: ${escapeHtml(r.createdAt || "Draft")}</div>
      <table><tbody>
        <tr><th>Today I completed</th><td>${escapeHtml(r.completed)}</td></tr>
        <tr><th>Pending</th><td>${escapeHtml(r.pending)}</td></tr>
        <tr><th>Tomorrow priority</th><td>${escapeHtml(r.tomorrow)}</td></tr>
        <tr><th>Money opportunity / client follow-up</th><td>${escapeHtml(r.opportunity)}</td></tr>
        <tr><th>Follow-ups</th><td>${escapeHtml(r.followups)}</td></tr>
        <tr><th>Notes</th><td>${escapeHtml(r.notes)}</td></tr>
      </tbody></table>`;
    printHtml("MOPAS Daily Report", body);
  };

  return (
    <div style={{ display:"grid", gridTemplateColumns:"420px 1fr", gap:18, alignItems:"start" }}>
      <div style={PNL}>
        <div style={{ color:C.gold, fontSize:11, letterSpacing:2, marginBottom:10 }}>MOPAS DAILY REPORT</div>
        <Input label="DATE" type="date" value={form.date} onChange={set("date")} />
        <Textarea label="TODAY I COMPLETED" value={form.completed} onChange={set("completed")} />
        <Textarea label="PENDING" value={form.pending} onChange={set("pending")} />
        <Textarea label="TOMORROW PRIORITY" value={form.tomorrow} onChange={set("tomorrow")} />
        <Textarea label="MONEY OPPORTUNITY / CLIENT FOLLOW-UP" value={form.opportunity} onChange={set("opportunity")} />
        <Textarea label="FOLLOW-UPS" value={form.followups} onChange={set("followups")} />
        <Textarea label="NOTES" value={form.notes} onChange={set("notes")} />
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <Btn orange onClick={saveReport}>Save Daily Report</Btn>
          <Btn ghost onClick={() => exportReport({ ...form, createdAt:"Draft" })}>Export PDF</Btn>
        </div>
      </div>
      <div style={PNL}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div>
            <div style={{ color:C.gold, fontSize:11, letterSpacing:2 }}>SAVED REPORTS</div>
            <div style={{ color:C.creamSoft, fontSize:12 }}>View, export, or delete MOPAS operation reports.</div>
          </div>
          <Badge color={C.blue}>{reports.length} saved</Badge>
        </div>
        {!reports.length && <div style={{ color:C.muted, textAlign:"center", padding:35 }}>No saved daily reports yet.</div>}
        {reports.map(r => (
          <div key={r.id} style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:14, marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
              <div>
                <div style={{ color:C.cream, fontWeight:700 }}>{r.date}</div>
                <div style={{ color:C.muted, fontSize:11 }}>{r.createdAt}</div>
              </div>
              <div style={{ display:"flex", gap:6 }}>
                <Btn small ghost onClick={() => exportReport(r)}>Export PDF</Btn>
                <Btn small ghost onClick={() => deleteReport(r.id)} style={{ color:C.red, borderColor:C.red }}>Delete</Btn>
              </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
              <div><div style={{ color:C.gold, fontSize:10, letterSpacing:1 }}>COMPLETED</div><div style={{ color:C.creamSoft, fontSize:12, whiteSpace:"pre-wrap" }}>{r.completed || "-"}</div></div>
              <div><div style={{ color:C.gold, fontSize:10, letterSpacing:1 }}>PENDING</div><div style={{ color:C.creamSoft, fontSize:12, whiteSpace:"pre-wrap" }}>{r.pending || "-"}</div></div>
              <div><div style={{ color:C.gold, fontSize:10, letterSpacing:1 }}>TOMORROW</div><div style={{ color:C.creamSoft, fontSize:12, whiteSpace:"pre-wrap" }}>{r.tomorrow || "-"}</div></div>
              <div><div style={{ color:C.gold, fontSize:10, letterSpacing:1 }}>OPPORTUNITY</div><div style={{ color:C.creamSoft, fontSize:12, whiteSpace:"pre-wrap" }}>{r.opportunity || "-"}</div></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TenderFolderCreator() {
  const [form, setForm] = useState({ tenderName:"", client:"", year:String(new Date().getFullYear()) });
  const sanitizeWinName = (value, fallback) => String(value || "").replace(/[<>:"/\\|?*]/g, "-").replace(/\s+/g, " ").trim() || fallback;
  const folderName = [sanitizeWinName(form.tenderName, "TENDER NAME"), sanitizeWinName(form.client, "CLIENT"), sanitizeWinName(form.year, "YEAR")].join(" - ");
  const rootPath = TENDER_ROOT + "\\" + folderName;
  const subfolders = [
    "01_Tender Documents from Client",
    "01_Tender Documents from Client\\Tender Document - Bidding Document",
    "01_Tender Documents from Client\\Terms of Reference - Technical Specifications",
    "02_Administrative Documents",
    "02_Administrative Documents\\Company Registration Certificate - RDB",
    "02_Administrative Documents\\Tax Clearance Certificate - RRA",
    "02_Administrative Documents\\RSSB Clearance Certificate",
    "02_Administrative Documents\\VAT Certificate",
    "02_Administrative Documents\\Trading License",
    "02_Administrative Documents\\Beneficial Ownership Declaration",
    "02_Administrative Documents\\Power of Attorney - Authorization of Signatory",
    "02_Administrative Documents\\National ID - Passport of Signatory",
    "02_Administrative Documents\\Bid Security - Declaration of Commitment",
    "03_Technical Proposal",
    "03_Technical Proposal\\Technical Response",
    "03_Technical Proposal\\Methodology",
    "03_Technical Proposal\\Work Plan",
    "03_Technical Proposal\\Delivery Schedule",
    "03_Technical Proposal\\Team Composition",
    "03_Technical Proposal\\CVs of Key Staff",
    "03_Technical Proposal\\Equipment List",
    "03_Technical Proposal\\Technical Specifications Compliance Table",
    "04_Company Experience & References",
    "04_Company Experience & References\\Similar Contracts",
    "04_Company Experience & References\\Certificates of Good Completion",
    "04_Company Experience & References\\LPOs - Contracts",
    "04_Company Experience & References\\Client Recommendation Letters",
    "04_Company Experience & References\\Portfolio - Photos of Similar Works",
    "05_Financial Proposal",
    "05_Financial Proposal\\Financial Offer",
    "05_Financial Proposal\\Price Schedule",
    "05_Financial Proposal\\BOQ - Quotation",
    "06_Forms to Fill",
    "06_Forms to Fill\\Bid Submission Form",
    "06_Forms to Fill\\Price Schedule Form",
    "06_Forms to Fill\\Technical Compliance Form",
    "06_Forms to Fill\\Declaration Forms",
    "06_Forms to Fill\\Manufacturer - Supplier Authorization Forms",
    "07_Draft Working Files",
    "07_Draft Working Files\\Word Drafts",
    "07_Draft Working Files\\Excel Drafts",
    "07_Draft Working Files\\Editable Design Files",
    "07_Draft Working Files\\Notes - Internal Checklist",
    "08_Final Submission Files",
    "08_Final Submission Files\\Final Technical Proposal - PDF",
    "08_Final Submission Files\\Final Financial Proposal - PDF",
    "08_Final Submission Files\\Final Administrative Documents - PDF",
    "08_Final Submission Files\\Combined Final Tender Submission - PDF",
    "08_Final Submission Files\\Uploaded Version - Submitted Copy",
    "09_Proof of Submission",
    "09_Proof of Submission\\Umucyo Submission Receipt",
    "09_Proof of Submission\\Email Submission Proof",
    "09_Proof of Submission\\Tender Purchase Receipt",
  ];
  const buildBat = () => {
    const lines = ["@echo off", "setlocal", `set "ROOT=${rootPath}"`, "md \"%ROOT%\" 2>nul"];
    subfolders.forEach(p => lines.push(`md "%ROOT%\\${p}" 2>nul`));
    lines.push("echo.", "echo Tender folder structure created:", "echo %ROOT%", "echo.", "pause");
    return lines.join("\r\n");
  };
  const downloadBat = () => {
    const blob = new Blob([buildBat()], { type:"application/bat" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Create Tender Folder - " + folderName + ".bat";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={PNL}>
      <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center", marginBottom:16, flexWrap:"wrap" }}>
        <div>
          <div style={{ color:C.gold, fontSize:11, letterSpacing:2 }}>CREATE TENDER FOLDER</div>
          <div style={{ color:C.creamSoft, fontSize:12, marginTop:2 }}>Generate a Windows folder creator for MOPAS tender preparation.</div>
        </div>
        <Btn orange onClick={downloadBat}>Download Folder Creator .bat</Btn>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 160px", gap:10 }}>
        <Input label="TENDER NAME" value={form.tenderName} onChange={e => setForm(f => ({ ...f, tenderName:e.target.value }))} placeholder="e.g. Audio Visual Production" />
        <Input label="CLIENT" value={form.client} onChange={e => setForm(f => ({ ...f, client:e.target.value }))} placeholder="e.g. NESA" />
        <Input label="YEAR" value={form.year} onChange={e => setForm(f => ({ ...f, year:e.target.value }))} placeholder="2026" />
      </div>
      <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:14, marginTop:4 }}>
        <div style={{ color:C.gold, fontSize:10, letterSpacing:2, marginBottom:6 }}>FOLDER PATH PREVIEW</div>
        <div style={{ color:C.cream, fontSize:13, wordBreak:"break-word" }}>{rootPath}</div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:10, marginTop:14 }}>
        {["Administrative Documents", "Technical Proposal", "Financial Proposal", "Forms to Fill", "Final Submission Files", "Proof of Submission"].map(x => (
          <div key={x} style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:12, color:C.creamSoft, fontSize:12 }}>{x}</div>
        ))}
      </div>
    </div>
  );
}



function AuthGate({ backendNotice, backendBusy, onLogin, onRegister }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name:"Samu", email:"ishimwesamuel3d@gmail.com", password:"" });
  const isRegister = mode === "register";
  const submit = () => {
    const email = form.email.trim();
    const password = form.password;
    if (!email || !password) return;
    if (isRegister) onRegister({ name:form.name.trim() || "Samu", email, password });
    else onLogin({ email, password });
  };
  return (
    <div style={{ minHeight:"100vh", background:`radial-gradient(circle at top left, ${C.orange}22, transparent 36%), radial-gradient(circle at bottom right, ${C.gold}18, transparent 34%), ${C.bg}`, color:C.cream, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"Segoe UI, Helvetica Neue, sans-serif" }}>
      <div style={{ width:"100%", maxWidth:1040, display:"grid", gridTemplateColumns:"minmax(0, 1.1fr) minmax(360px, .9fr)", gap:22, alignItems:"stretch" }}>
        <div style={{ background:C.surface, border:"1px solid "+C.border, borderRadius:22, padding:28, boxShadow:"0 28px 90px #0008", display:"flex", flexDirection:"column", justifyContent:"space-between", minHeight:520 }}>
          <div>
            <Logo size="large" />
            <div style={{ color:C.gold, fontSize:12, letterSpacing:2, fontWeight:900, marginTop:20 }}>AFTERGLOW / MOPAS WORKSPACE</div>
            <h1 style={{ margin:"10px 0 10px", fontSize:42, lineHeight:1.05 }}>Sign in to continue your discipline system.</h1>
            <p style={{ color:C.creamSoft, fontSize:15, lineHeight:1.7, maxWidth:620 }}>Your tasks, MOPAS work, money tracking, calendar, settings, and daily routine sync through the backend. Login first, then AFTERGLOW opens directly connected to MongoDB Atlas.</p>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:10, marginTop:22 }}>
            {[
              ["Cloud Sync", "Tasks load from backend automatically"],
              ["Secure Access", "Dashboard stays hidden until login"],
              ["Local Backup", "Browser data remains protected"],
            ].map(([title, text]) => (
              <div key={title} style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:14, padding:14 }}>
                <div style={{ color:C.orange, fontWeight:900, fontSize:13 }}>{title}</div>
                <div style={{ color:C.creamSoft, fontSize:12, lineHeight:1.45, marginTop:5 }}>{text}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background:C.surface, border:"1px solid "+C.border, borderRadius:22, padding:24, boxShadow:"0 28px 90px #0008", display:"flex", flexDirection:"column", justifyContent:"center" }}>
          <div style={{ color:C.gold, fontSize:11, letterSpacing:2, fontWeight:900 }}>{isRegister ? "CREATE ACCOUNT" : "LOGIN REQUIRED"}</div>
          <h2 style={{ margin:"8px 0 6px", fontSize:26 }}>{isRegister ? "Create your workspace account" : "Welcome back"}</h2>
          <div style={{ color:C.creamSoft, fontSize:13, lineHeight:1.55, marginBottom:16 }}>Backend: {API_BASE_URL}</div>
          {isRegister && <Input label="NAME" value={form.name} onChange={e => setForm(f => ({ ...f, name:e.target.value }))} />}
          <Input label="EMAIL" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email:e.target.value }))} />
          <Input label="PASSWORD" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password:e.target.value }))} onKeyDown={e => { if (e.key === "Enter") submit(); }} placeholder="Enter your password" />
          <Btn orange disabled={backendBusy || !form.email.trim() || !form.password} onClick={submit} style={{ width:"100%", marginTop:4 }}>{backendBusy ? "Connecting..." : isRegister ? "Create Account & Open AFTERGLOW" : "Login & Open AFTERGLOW"}</Btn>
          <Btn ghost disabled={backendBusy} onClick={() => setMode(isRegister ? "login" : "register")} style={{ width:"100%", marginTop:10 }}>
            {isRegister ? "I already have an account" : "Create a new account"}
          </Btn>
          {backendNotice && (
            <div style={{ marginTop:14, background:backendNotice.type === "error" ? C.red+"18" : backendNotice.type === "success" ? C.green+"18" : C.blue+"18", border:"1px solid "+(backendNotice.type === "error" ? C.red : backendNotice.type === "success" ? C.green : C.blue), color:C.cream, borderRadius:12, padding:12, fontSize:12, lineHeight:1.45 }}>
              {backendNotice.message}
            </div>
          )}
          <div style={{ color:C.muted, fontSize:11, lineHeight:1.45, marginTop:14 }}>After login, cloud sync starts automatically. Use Upload Local Tasks later if you want to move old browser tasks into MongoDB.</div>
        </div>
      </div>
    </div>
  );
}

function CloudSyncPanel({ auth, backendNotice, backendBusy, onLogin, onRegister, onLogout, onRefresh, onUploadLocal }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name:"Samu", email:"ishimwesamuel3d@gmail.com", password:"" });
  const isConnected = !!auth?.token;
  const submitLogin = () => onLogin({ email:form.email.trim(), password:form.password });
  const submitRegister = () => onRegister({ name:form.name.trim() || "Samu", email:form.email.trim(), password:form.password });
  return (
    <div style={{ position:"relative" }}>
      <Btn ghost small onClick={() => setOpen(v => !v)} style={{ borderColor:isConnected ? C.green : C.border, color:isConnected ? C.green : C.cream }}>
        {isConnected ? "Cloud Tools" : "Login"}
      </Btn>
      {open && (
        <div style={{ position:"absolute", right:0, top:"calc(100% + 8px)", width:360, maxWidth:"86vw", background:C.surface, border:"1px solid "+C.border, borderRadius:14, padding:14, zIndex:40, boxShadow:"0 20px 60px #0009" }}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"center", marginBottom:10 }}>
            <div>
              <div style={{ color:C.gold, fontSize:11, letterSpacing:2, fontWeight:800 }}>BACKEND SYNC</div>
              <div style={{ color:C.creamSoft, fontSize:12 }}>{API_BASE_URL}</div>
            </div>
            <Btn small ghost onClick={() => setOpen(false)}>Close</Btn>
          </div>
          {isConnected ? (
            <>
              <div style={{ background:C.bg, border:"1px solid "+C.border, borderRadius:10, padding:10, marginBottom:10 }}>
                <div style={{ color:C.green, fontWeight:800, fontSize:13 }}>Signed in</div>
                <div style={{ color:C.cream, fontSize:13, marginTop:4 }}>{auth?.user?.name || "AFTERGLOW user"}</div>
                <div style={{ color:C.creamSoft, fontSize:12 }}>{auth?.user?.email || ""}</div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <Btn small orange disabled={backendBusy} onClick={onRefresh}>Sync From Cloud</Btn>
                <Btn small disabled={backendBusy} onClick={onUploadLocal}>Upload Local Tasks</Btn>
                <Btn small ghost onClick={onLogout} style={{ gridColumn:"1 / -1", color:C.red, borderColor:C.red }}>Logout</Btn>
              </div>
            </>
          ) : (
            <>
              <Input label="NAME" value={form.name} onChange={e => setForm(f => ({ ...f, name:e.target.value }))} />
              <Input label="EMAIL" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email:e.target.value }))} />
              <Input label="PASSWORD" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password:e.target.value }))} placeholder="Your backend password" />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <Btn small orange disabled={backendBusy || !form.email || !form.password} onClick={submitLogin}>Login</Btn>
                <Btn small disabled={backendBusy || !form.email || !form.password} onClick={submitRegister}>Register</Btn>
              </div>
            </>
          )}
          {backendNotice && (
            <div style={{ marginTop:10, background:backendNotice.type === "error" ? C.red+"18" : backendNotice.type === "success" ? C.green+"18" : C.blue+"18", border:"1px solid "+(backendNotice.type === "error" ? C.red : backendNotice.type === "success" ? C.green : C.blue), color:C.cream, borderRadius:10, padding:10, fontSize:12, lineHeight:1.4 }}>
              {backendNotice.message}
            </div>
          )}
          <div style={{ color:C.muted, fontSize:11, marginTop:10, lineHeight:1.4 }}>
            Cloud sync is automatic after login. Use these tools to manually refresh or upload old local tasks.
          </div>
        </div>
      )}
    </div>
  );
}

function AfterglowApp() {
  const [tasks, setTasks] = useState(() => {
    const stored = load();
    const base = (stored.length ? stored : SEEDS).map(normalizeTask);
    return ensureRoutineTasksForDate(base, localTodayISO()).map(normalizeTask);
  });
  const [settings, setSettings] = useState(() => {
    const loaded = loadAppSettings();
    const shouldMigrateDoneDefault = false;
    const migratedAppearance = {
      ...(loaded.appearance || {}),
      dashboardIcon: (!loaded.appearance?.dashboardIcon || loaded.appearance?.dashboardLabel === "Everything Dashboard") ? "▨" : loaded.appearance.dashboardIcon,
      dashboardLabel: loaded.appearance?.dashboardLabel === "Everything Dashboard" ? "Command Center" : (loaded.appearance?.dashboardLabel || DEFAULT_APP_SETTINGS.appearance.dashboardLabel),
    };
    return mergeAppSettings({
      ...loaded,
      appearance:migratedAppearance,
      tasks:{
        ...loaded.tasks,
        completedVisibility: "show",
        overdueBehavior: loaded.tasks?.overdueBehavior || "move late down",
        doneDefaultMigrated:true,
      }
    });
  });
  const [activeSpace, setActiveSpace] = useState(() => {
    const preferredSpace = loadAppSettings().general.defaultSpace || "wakeup";
    return SPACES.some(space => space.id === preferredSpace) ? preferredSpace : "wakeup";
  });
  const [view, setView] = useState("dashboard");
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [spaceFilter, setSpaceFilter] = useState("active");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [deadlineFilter, setDeadlineFilter] = useState("All");
  const [showDoneTasks, setShowDoneTasks] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [showEndDayReview, setShowEndDayReview] = useState(false);
  const [emailNotice, setEmailNotice] = useState(null);
  const [backendNotice, setBackendNotice] = useState(null);
  const [backendBusy, setBackendBusy] = useState(false);
  const [auth, setAuth] = useState(() => ({ token:getStoredAuthToken(), user:getStoredAuthUser() }));
  const [autoSyncDone, setAutoSyncDone] = useState(false);
  const [screenWidth, setScreenWidth] = useState(() => typeof window !== "undefined" ? window.innerWidth : 1366);
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== "undefined" ? window.innerWidth >= 900 : true);
  const isCompactLayout = screenWidth < 1100;
  const safeSettings = useMemo(() => mergeAppSettings(settings || {}), [settings]);
  applyAppearanceSettings(safeSettings);

  useEffect(() => { save(tasks.map(normalizeTask)); }, [tasks]);
  useEffect(() => { saveAppSettings(settings); }, [settings]);

  useEffect(() => {
    const onResize = () => setScreenWidth(window.innerWidth || 1366);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const behavior = settings?.appearance?.sidebarBehavior || "auto";
    if (behavior === "collapsed") setSidebarOpen(false);
    if (behavior === "always open") setSidebarOpen(true);
    if (behavior === "auto") setSidebarOpen(screenWidth >= 900);
  }, [settings?.appearance?.sidebarBehavior, screenWidth]);

  useEffect(() => { loadStructuredGoals(); }, []);

  useEffect(() => {
    const ensureTodayRoutine = () => {
      if (!settings?.routine?.autoRoutineTasks) return;
      setTasks(prev => {
        const next = ensureRoutineTasksForDate(prev, localTodayISO());
        return next.length === prev.length ? prev : next;
      });
    };
    ensureTodayRoutine();
    const timer = window.setInterval(ensureTodayRoutine, 60000);
    return () => window.clearInterval(timer);
  }, [settings?.routine?.autoRoutineTasks]);

  const getEmailEndpoint = useCallback(() => String(
    settings?.notifications?.googleAppsScriptEmailUrl || settings?.documents?.googleAppsScriptUploadUrl || ""
  ).trim(), [settings?.notifications?.googleAppsScriptEmailUrl, settings?.documents?.googleAppsScriptUploadUrl]);

  const sendTodayDisciplineEmail = useCallback(async ({ manual = false, silent = false } = {}) => {
    const endpoint = getEmailEndpoint();
    const setNotice = (notice) => { if (!silent) setEmailNotice(notice); };
    if (!settings?.notifications?.emailNotifications && !manual) return false;
    if (!endpoint) {
      setNotice({ type:"error", message:"Missing Apps Script Email URL. Add it in Settings → Notifications or click Use Drive Upload URL." });
      return false;
    }
    if (!endpoint.includes("script.google.com/macros/s/") || !endpoint.endsWith("/exec")) {
      setNotice({ type:"error", message:"Invalid Apps Script URL. Use the deployed Web App URL ending with /exec." });
      return false;
    }
    const payload = buildTodayDisciplinePlanEmail(tasks, settings);
    if (!payload.to) {
      setNotice({ type:"error", message:"Missing email address. Add your email in Settings → Notifications." });
      return false;
    }
    setNotice({ type:"info", message:"Sending current action email..." });
    try {
      const emailEndpoint = endpoint + (endpoint.includes("?") ? "&" : "?") + "action=sendEmail";
      const response = await fetch(emailEndpoint, {
        method:"POST",
        redirect:"follow",
        headers:{ "Content-Type":"text/plain;charset=utf-8" },
        body:JSON.stringify({ ...payload, action:"sendEmail", mode:"emailNotification" }),
      });
      const raw = await response.text();
      let result = {};
      try { result = raw ? JSON.parse(raw) : {}; } catch { result = { success:false, message:raw || "Apps Script returned an unreadable response." }; }
      if (!response.ok || result.success === false) {
        throw new Error(result.message || `Email send failed (${response.status}).`);
      }
      setNotice({ type:"success", message:`Current action email sent to ${payload.to}.` });
      return true;
    } catch (error) {
      const message = String(error && error.message ? error.message : error);
      setNotice({ type:"error", message:`Email send failed: ${message}` });
      return false;
    }
  }, [tasks, settings, getEmailEndpoint]);

  useEffect(() => {
    if (!settings?.notifications?.emailNotifications || !settings?.notifications?.todayDisciplineEmail) return undefined;
    const sentKey = "afterglow_today_discipline_email_sent_v1";
    const checkAndSend = async () => {
      const todayKey = localTodayISO();
      try { if (window.localStorage.getItem(sentKey) === todayKey) return; } catch {}
      const [h, m] = String(settings?.notifications?.todayDisciplineEmailTime || "05:45").split(":").map(Number);
      const sendMinutes = (Number.isFinite(h) ? h : 5) * 60 + (Number.isFinite(m) ? m : 45);
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (nowMinutes < sendMinutes) return;
      const ok = await sendTodayDisciplineEmail({ silent:true });
      if (ok) {
        try { window.localStorage.setItem(sentKey, todayKey); } catch {}
      }
    };
    checkAndSend();
    const timer = window.setInterval(checkAndSend, 60000);
    return () => window.clearInterval(timer);
  }, [settings?.notifications?.emailNotifications, settings?.notifications?.todayDisciplineEmail, settings?.notifications?.todayDisciplineEmailTime, sendTodayDisciplineEmail]);


  const refreshCloudTasks = useCallback(async () => {
    if (!getStoredAuthToken()) {
      setBackendNotice({ type:"error", message:"Login first before syncing from backend." });
      return;
    }
    setBackendBusy(true);
    setBackendNotice({ type:"info", message:"Syncing tasks from MongoDB..." });
    try {
      const result = await afterglowApiRequest("/api/tasks?limit=500");
      const cloudTasks = (result.data || []).map(taskFromApi);
      setTasks(prev => ensureRoutineTasksForDate(mergeCloudTasks(prev, cloudTasks), localTodayISO()).map(normalizeTask));
      setBackendNotice({ type:"success", message:`Synced ${cloudTasks.length} cloud task${cloudTasks.length === 1 ? "" : "s"}.` });
    } catch (error) {
      if (error?.status === 401) {
        setStoredAuth("", null);
        setAuth({ token:"", user:null });
        setAutoSyncDone(false);
        setBackendNotice({ type:"error", message:"Session expired. Please login again." });
      } else {
        setBackendNotice({ type:"error", message:String(error?.message || error) });
      }
    } finally {
      setBackendBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!auth?.token || autoSyncDone) return;
    setAutoSyncDone(true);
    refreshCloudTasks();
  }, [auth?.token, autoSyncDone, refreshCloudTasks]);

  const handleBackendLogin = useCallback(async (payload) => {
    setBackendBusy(true);
    setBackendNotice({ type:"info", message:"Logging in to AFTERGLOW backend..." });
    try {
      const result = await afterglowApiRequest("/api/auth/login", { method:"POST", body:JSON.stringify(payload) });
      setStoredAuth(result.token, result.user);
      setAuth({ token:result.token, user:result.user });
      setBackendNotice({ type:"success", message:"Backend connected. Loading cloud tasks..." });
      const taskResult = await afterglowApiRequest("/api/tasks?limit=500");
      const cloudTasks = (taskResult.data || []).map(taskFromApi);
      setTasks(prev => ensureRoutineTasksForDate(mergeCloudTasks(prev, cloudTasks), localTodayISO()).map(normalizeTask));
      setAutoSyncDone(true);
      setBackendNotice({ type:"success", message:`Connected as ${result.user?.name || "user"}. ${cloudTasks.length} cloud task${cloudTasks.length === 1 ? "" : "s"} loaded.` });
    } catch (error) {
      setBackendNotice({ type:"error", message:String(error?.message || error) });
    } finally {
      setBackendBusy(false);
    }
  }, []);

  const handleBackendRegister = useCallback(async (payload) => {
    setBackendBusy(true);
    setBackendNotice({ type:"info", message:"Creating backend account..." });
    try {
      const result = await afterglowApiRequest("/api/auth/register", { method:"POST", body:JSON.stringify(payload) });
      setStoredAuth(result.token, result.user);
      setAuth({ token:result.token, user:result.user });
      setBackendNotice({ type:"success", message:"Account created. Loading cloud tasks..." });
      const taskResult = await afterglowApiRequest("/api/tasks?limit=500");
      const cloudTasks = (taskResult.data || []).map(taskFromApi);
      setTasks(prev => ensureRoutineTasksForDate(mergeCloudTasks(prev, cloudTasks), localTodayISO()).map(normalizeTask));
      setAutoSyncDone(true);
      setBackendNotice({ type:"success", message:`Account created for ${result.user?.name || "user"}. ${cloudTasks.length} cloud task${cloudTasks.length === 1 ? "" : "s"} loaded.` });
    } catch (error) {
      setBackendNotice({ type:"error", message:String(error?.message || error) });
    } finally {
      setBackendBusy(false);
    }
  }, []);

  const handleBackendLogout = useCallback(() => {
    setStoredAuth("", null);
    setAuth({ token:"", user:null });
    setAutoSyncDone(false);
    setBackendNotice({ type:"info", message:"Logged out from backend. Local data remains available." });
  }, []);

  const uploadLocalTasksToCloud = useCallback(async () => {
    if (!getStoredAuthToken()) {
      setBackendNotice({ type:"error", message:"Login first before uploading local tasks." });
      return;
    }
    const localOnly = tasks.map(normalizeTask).filter(task => !getTaskCloudId(task));
    if (!localOnly.length) {
      setBackendNotice({ type:"success", message:"All visible tasks already have cloud IDs." });
      return;
    }
    setBackendBusy(true);
    setBackendNotice({ type:"info", message:`Uploading ${localOnly.length} local task${localOnly.length === 1 ? "" : "s"} to MongoDB...` });
    try {
      const uploaded = [];
      for (const task of localOnly) {
        const result = await afterglowApiRequest("/api/tasks", { method:"POST", body:JSON.stringify(taskPayloadForApi(task)) });
        if (result.data) uploaded.push(taskFromApi(result.data));
      }
      setTasks(prev => mergeCloudTasks(prev, uploaded));
      setBackendNotice({ type:"success", message:`Uploaded ${uploaded.length} task${uploaded.length === 1 ? "" : "s"} to MongoDB.` });
    } catch (error) {
      setBackendNotice({ type:"error", message:String(error?.message || error) });
    } finally {
      setBackendBusy(false);
    }
  }, [tasks]);

  const sp = SPACES.find(s => s.id === activeSpace) || SPACES[0];
  const deadlineMatches = useCallback((task, filter) => {
    if (filter === "All") return true;
    if (filter === "No deadline") return !isDateKey(task.due);
    const today = localTodayISO();
    const diff = isDateKey(task.due) ? daysBetweenLocal(today, task.due) : null;
    if (filter === "Overdue") return diff !== null && diff < 0 && task.status !== "Done";
    if (filter === "Today") return diff === 0;
    if (filter === "Tomorrow") return diff === 1;
    if (filter === "This week") return diff !== null && diff >= 0 && diff <= 7;
    return true;
  }, []);
  const filtered = useMemo(() => sortTasksSmart(tasks.filter(t => {
    const txt = getTaskSearchText(t);
    const scopeOk = spaceFilter === "all" ? true : t.space === activeSpace;
    const statusOk = statusFilter === "All" ? true : t.status === statusFilter;
    const priorityOk = priorityFilter === "All" ? true : t.priority === priorityFilter;
    const deadlineOk = deadlineMatches(t, deadlineFilter);
    return scopeOk && statusOk && priorityOk && deadlineOk && txt.includes(query.toLowerCase());
  })), [tasks, activeSpace, query, spaceFilter, statusFilter, priorityFilter, deadlineFilter, deadlineMatches]);

  const createTask = useCallback(async (t) => {
    const task = normalizeTask({ priority:settings?.tasks?.defaultPriority || "Normal", ...t });
    const finalTask = task.status === "Done" && !task.completedAt ? { ...task, completedAt:new Date().toISOString(), locked:true } : task;
    setTasks(prev => sortTasksSmart([finalTask, ...prev]));
    setSelected(finalTask);
    setView("list");
    setShowNewTask(false);
    if (!getStoredAuthToken()) return;
    try {
      const result = await afterglowApiRequest("/api/tasks", { method:"POST", body:JSON.stringify(taskPayloadForApi(finalTask)) });
      if (result.data) {
        const cloudTask = taskFromApi(result.data);
        setTasks(prev => sortTasksSmart(prev.map(item => item.id === finalTask.id ? cloudTask : item)));
        setSelected(cloudTask);
        setBackendNotice({ type:"success", message:"Task saved to MongoDB." });
      }
    } catch (error) {
      setBackendNotice({ type:"error", message:`Task saved locally, but cloud save failed: ${String(error?.message || error)}` });
    }
  }, [settings?.tasks?.defaultPriority]);
  const updateTask = useCallback(async (u) => {
    let cloudId = getTaskCloudId(u);
    let apiPayload = null;
    setTasks(prev => {
      let selectedNext = null;
      const mapped = prev.map(t => {
        if (t.id !== u.id && getTaskCloudId(t) !== cloudId) return t;
        const oldTask = normalizeTask(t);
        if (!cloudId) cloudId = getTaskCloudId(oldTask);
        let nextTask = normalizeTask({ ...oldTask, ...u, updatedAt:new Date().toISOString() });
        if (nextTask.status === "Done" && oldTask.status !== "Done") nextTask = { ...nextTask, completedAt:new Date().toISOString(), locked:true };
        if (nextTask.status !== "Done" && oldTask.status === "Done") nextTask = { ...nextTask, completedAt:"", locked:false };
        apiPayload = nextTask;
        selectedNext = nextTask;
        return nextTask;
      });
      if (selectedNext) setSelected(selectedNext);
      return sortTasksSmart(mapped);
    });
    if (!getStoredAuthToken() || !cloudId || !apiPayload) return;
    try {
      const result = await afterglowApiRequest(`/api/tasks/${cloudId}`, { method:"PATCH", body:JSON.stringify(taskPayloadForApi(apiPayload)) });
      if (result.data) {
        const cloudTask = taskFromApi(result.data);
        setTasks(prev => sortTasksSmart(prev.map(item => (item.id === apiPayload.id || getTaskCloudId(item) === cloudId) ? cloudTask : item)));
        setSelected(prev => prev && (prev.id === apiPayload.id || getTaskCloudId(prev) === cloudId) ? cloudTask : prev);
      }
    } catch (error) {
      setBackendNotice({ type:"error", message:`Cloud update failed: ${String(error?.message || error)}` });
    }
  }, []);
  const deleteTask = useCallback(async (id) => {
    const target = tasks.find(t => t.id === id || getTaskCloudId(t) === id);
    const cloudId = getTaskCloudId(target || { id });
    setTasks(prev => prev.filter(t => t.id !== id && getTaskCloudId(t) !== id));
    setSelected(null);
    if (!getStoredAuthToken() || !cloudId) return;
    try {
      await afterglowApiRequest(`/api/tasks/${cloudId}`, { method:"DELETE" });
      setBackendNotice({ type:"success", message:"Task deleted from MongoDB." });
    } catch (error) {
      setBackendNotice({ type:"error", message:`Deleted locally, but cloud delete failed: ${String(error?.message || error)}` });
    }
  }, [tasks]);
  const goSpace = (id) => {
    const safeId = SPACES.some(space => space.id === id) ? id : "wakeup";
    setActiveSpace(safeId);
    setView("list");
    setSelected(null);
    setQuery("");
    setSpaceFilter("active");
    setStatusFilter("All");
    setPriorityFilter("All");
    setDeadlineFilter("All");
  };
  const saveEndDayReview = useCallback((review) => {
    const previous = readStore(END_DAY_REVIEW_KEY, []);
    const next = [{ id:"EDR-" + Date.now(), ...review }, ...(Array.isArray(previous) ? previous : [])];
    writeStore(END_DAY_REVIEW_KEY, next);
  }, []);
  const moveUnfinishedNormalTasksToTomorrow = useCallback(() => {
    if (settings?.tasks?.autoMoveUnfinished === "never") return;
    const todayKey = localTodayISO();
    const tomorrowKey = addDaysISO(todayKey, 1);
    setTasks(prev => prev.map(t => (
      t && t.status !== "Done" && !t.isRoutine && isDateKey(t.due) && t.due === todayKey
        ? { ...t, due: tomorrowKey, updatedAt:new Date().toISOString() }
        : t
    )));
  }, [settings?.tasks?.autoMoveUnfinished]);
  const generateTomorrowRoutineTasks = useCallback(() => {
    const tomorrowKey = addDaysISO(localTodayISO(), 1);
    setTasks(prev => {
      const next = ensureRoutineTasksForDate(prev, tomorrowKey);
      return next.length === prev.length ? prev : next;
    });
  }, []);

  const exportBackup = useCallback(() => {
    const backup = buildAppBackup(tasks);
    downloadTextFile(`AFTERGLOW-backup-${localTodayISO()}.json`, JSON.stringify(backup, null, 2));
  }, [tasks]);
  const importBackup = useCallback((event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result || "{}"));
        if (Array.isArray(data.tasks)) {
          setTasks(prev => {
            const byId = new Map(prev.map(task => [task.id, normalizeTask(task)]));
            data.tasks.map(normalizeTask).forEach(task => { if (task.id && !byId.has(task.id)) byId.set(task.id, task); });
            return ensureRoutineTasksForDate(sortTasksSmart([...byId.values()]), localTodayISO());
          });
        }
        if (Array.isArray(data.documents)) writeStore(DOCUMENTS_KEY, data.documents);
        if (Array.isArray(data.dailyReports)) writeStore(DAILY_REPORT_KEY, data.dailyReports);
        if (Array.isArray(data.endDayReviews)) writeStore(END_DAY_REVIEW_KEY, data.endDayReviews);
        if (data.goalsText && typeof data.goalsText === "object") writeStore(Goals_TEXT_KEY, { ...readStore(Goals_TEXT_KEY, {}), ...data.goalsText });
        if (data.structuredGoals && typeof data.structuredGoals === "object") writeStore(STRUCTURED_GOALS_KEY, { ...loadStructuredGoals(), ...data.structuredGoals });
        if (data.settings && typeof data.settings === "object") setSettings(mergeAppSettings(data.settings));
      } catch {
        window.alert("Backup import failed. Please select a valid AFTERGLOW backup JSON file.");
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  }, []);

  const resetSettingsOnly = useCallback(() => {
    if (!window.confirm("Reset settings only? Tasks, documents, reports, and goals will stay safe.")) return;
    setSettings(DEFAULT_APP_SETTINGS);
  }, []);
  const clearTestData = useCallback(() => {
    if (!window.confirm("Clear only test data? This will keep normal tasks and documents.")) return;
    if (!window.confirm("Second confirmation: remove items marked TEST only?")) return;
    setTasks(prev => prev.filter(t => !String(t.id || "").startsWith("TEST-") && !String(t.title || "").toLowerCase().includes("test data")));
    const docs = readStore(DOCUMENTS_KEY, []);
    writeStore(DOCUMENTS_KEY, docs.filter(d => !String(d.id || "").startsWith("TEST-") && !String(d.title || "").toLowerCase().includes("test data")));
  }, []);

  const VIEWS = activeSpace === "mopas" ? ["list","board","calendar","Goals","documents","daily report","tender folder"] : ["list","board","calendar","Goals","documents"];

  if (!auth?.token) {
    return <AuthGate backendNotice={backendNotice} backendBusy={backendBusy} onLogin={handleBackendLogin} onRegister={handleBackendRegister} />;
  }

  return (
    <div style={{ display:"flex", height:"100vh", background:C.bg, color:C.cream, fontFamily:"Segoe UI, Helvetica Neue, sans-serif", overflow:"hidden", fontSize: safeSettings.appearance.fontSize === "small" ? 13 : safeSettings.appearance.fontSize === "large" ? 16 : safeSettings.appearance.compactMode ? 13 : 14 }}>
      <aside style={{ width: sidebarOpen ? 260 : 0, minWidth: sidebarOpen ? 260 : 0, background:C.surface, borderRight:"1px solid "+C.border, display:"flex", flexDirection:"column", transition:"all .2s", overflow:"hidden" }}>
        <div style={{ padding:"20px 18px 8px" }}><Logo size={safeSettings.appearance.logoSize || safeSettings.general.logoSize} /></div>
        {safeSettings.appearance.workspaceCard !== false && <div style={{ padding:"8px 18px" }}>

          <div style={{ ...PNL, background:C.elevated, padding:12 }}>

            <div style={{ color:C.gold, fontSize:11, letterSpacing:2 }}>WORKSPACE</div>

            <div style={{ fontWeight:700, fontSize:22, marginTop:2 }}>ISHIMWE SAMUEL</div>

            <div style={{ fontSize:11, color:C.creamSoft, marginTop:2 }}>{"Discipline \u00B7 MOPAS \u00B7 Creative \u00B7 Growth"}</div>

          </div>

        </div>}
        <div style={{ padding:"20px 18px" }}>
          <div onClick={() => { setView("dashboard"); setSelected(null); }}
            style={{ padding:"10px 14px", borderRadius:8, cursor:"pointer", marginBottom:4, background: view === "dashboard" ? C.elevated : "transparent", color: view === "dashboard" ? C.orange : C.cream, fontWeight:900, fontSize:13 }}>
            {`${safeSettings.appearance.dashboardIcon || "▨"} ${safeSettings.appearance.dashboardLabel || "Command Center"}`}
          </div>
        </div>
        <div style={{ padding:"4px 18px", flex:1, overflowY:"auto" }}>
          <div style={{ fontSize:10, color:C.muted, letterSpacing:2, padding:"8px 0 4px", fontWeight:700 }}>SPACES</div>
          {SPACES.map(s => {
            const count = tasks.filter(t => t.space === s.id).length;
            const active = activeSpace === s.id && view !== "dashboard";
            return (
              <div key={s.id} onClick={() => goSpace(s.id)} style={{ padding:"9px 12px", borderRadius:8, cursor:"pointer", marginBottom:3, display:"flex", alignItems:"center", gap:10, background: active ? C.elevated : C.surface, outline:"none", borderLeft: active ? "3px solid "+s.color : "3px solid transparent" }}>
                <span style={{ fontSize:16 }}>{s.icon}</span>
                <span style={{ flex:1, fontSize:13, fontWeight: active ? 700 : 400, color: active ? s.color : C.cream }}>{s.name}</span>
                {safeSettings.appearance.showTaskCounts !== false && <span style={{ fontSize:11, color:C.muted, background:C.bg, borderRadius:10, padding:"1px 8px" }}>{count}</span>}
              </div>
            );
          })}
        </div>
        <div style={{ padding:"10px 18px", borderTop:"5px solid "+C.border, fontSize:11, color:C.muted, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
          <span>{"AFTERGLOW © 2026 · v1"}</span>
          <button title="Settings" onClick={() => { setView("settings"); setSelected(null); }} style={{ width:32, height:32, borderRadius:10, border:"1px solid "+(view === "settings" ? C.orange : C.border), background:view === "settings" ? C.elevated : C.bg, color:view === "settings" ? C.orange : C.creamSoft, cursor:"pointer", fontSize:16, display:"flex", alignItems:"center", justifyContent:"center" }}>{"⚙"}</button>
        </div>
      </aside>

      <main style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", minWidth:0 }}>
        <header style={{ padding:"14px 24px", borderBottom:"1px solid "+C.border, display:"flex", justifyContent:"space-between", alignItems:"center", background:C.surface, flexWrap:"wrap", gap:10 }}>
          <div style={{ display:"flex", alignItems:"center", gap:9 }}>
            <span onClick={() => setSidebarOpen(o => !o)} style={{ cursor:"pointer", fontSize:20, color:C.creamSoft }}>{"\u2630"}</span>
            <div>
              <div style={{ fontWeight:700, fontSize:16 }}>{view === "dashboard" ? (safeSettings.appearance.dashboardLabel || "Command Center") : view === "settings" ? "Settings" : sp.name}</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            {view !== "dashboard" && view !== "settings" && VIEWS.map(v => (
              <span key={v} onClick={() => setView(v)} style={{ padding:"5px 14px", borderRadius:6, cursor:"pointer", fontSize:12, fontWeight:600, background: view === v ? C.elevated : "transparent", color: view === v ? C.orange : C.creamSoft, border: view === v ? "1px solid "+C.border : "1px solid transparent" }}>
                {v.split(" ").map(x => x.charAt(0).toUpperCase() + x.slice(1)).join(" ")}
              </span>
            ))}
           
            <CloudSyncPanel auth={auth} backendNotice={backendNotice} backendBusy={backendBusy} onLogin={handleBackendLogin} onRegister={handleBackendRegister} onLogout={handleBackendLogout} onRefresh={refreshCloudTasks} onUploadLocal={uploadLocalTasksToCloud} />
            <Btn ghost small onClick={handleBackendLogout} style={{ color:C.red, borderColor:C.red }}>Logout</Btn>
            <Btn ghost onClick={() => sendTodayDisciplineEmail({ manual:true })}>Email Current Action</Btn>
            <Btn ghost onClick={exportBackup}>Export Backup</Btn>
            <label style={{ padding:"8px 18px", borderRadius:8, border:"1px solid "+C.border, cursor:"pointer", background:"transparent", color:C.cream, fontSize:13, fontWeight:600 }}>
              Import Backup
              <input type="file" accept="application/json,.json" onChange={importBackup} style={{ display:"none" }} />
            </label>
            <Btn orange onClick={() => setShowNewTask(true)}>+ New task</Btn>
          </div>
        </header>

        {view !== "dashboard" && view !== "settings" && (
          <div style={{ padding:"12px 24px", borderBottom:"1px solid "+C.border, background:C.surface, display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))", gap:10, alignItems:"center" }}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Global search: task, tender, goal, document keyword..." style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1px solid "+C.border, background:C.bg, color:C.cream, outline:"none", boxSizing:"border-box" }} />
            <select value={spaceFilter} onChange={e => setSpaceFilter(e.target.value)} style={{ padding:"9px 10px", borderRadius:8, border:"1px solid "+C.border, background:C.bg, color:C.cream }}>
              <option value="active">Current space</option>
              <option value="all">All spaces</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding:"9px 10px", borderRadius:8, border:"1px solid "+C.border, background:C.bg, color:C.cream }}>
              {["All", ...STATUSES].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} style={{ padding:"9px 10px", borderRadius:8, border:"1px solid "+C.border, background:C.bg, color:C.cream }}>
              {["All", ...PRIORITIES].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
            <select value={deadlineFilter} onChange={e => setDeadlineFilter(e.target.value)} style={{ padding:"9px 10px", borderRadius:8, border:"1px solid "+C.border, background:C.bg, color:C.cream }}>
              {["All","Overdue","Today","Tomorrow","This week","No deadline"].map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        )}

        <div style={{ flex:1, overflow:"auto", padding:20, minWidth:0 }}>
          {view === "dashboard" ? <Dashboard tasks={tasks} activeSpace={activeSpace} settings={safeSettings} goSpace={goSpace} setView={setView} setActiveSpace={setActiveSpace} setSelected={setSelected} setShowNewTask={setShowNewTask} setShowEndDayReview={setShowEndDayReview} onUpdate={updateTask} /> : view === "settings" ? (
            <SettingsView settings={safeSettings} setSettings={setSettings} tasks={tasks} exportBackup={exportBackup} importBackup={importBackup} resetSettingsOnly={resetSettingsOnly} clearTestData={clearTestData} sendTodayDisciplineEmail={sendTodayDisciplineEmail} emailNotice={emailNotice} />
          ) : (
            <div style={{ display:"grid", gridTemplateColumns: (view === "list" || view === "board") ? (isCompactLayout ? "1fr" : "minmax(0, 1fr) minmax(320px, 500px)") : "1fr", gap:18, alignItems:"start", minWidth:0, maxWidth:"100%" }}>
              <div style={{ minWidth:0, overflow:"hidden" }}>
                {view === "list" && (activeSpace === "money" ? <><MoneySpaceFinancialHealth tasks={tasks} onUpdate={updateTask} /><ListView tasks={filtered} activeSpace={activeSpace} selected={selected} setSelected={setSelected} onUpdate={updateTask} settings={safeSettings} /></> : <ListView tasks={filtered} activeSpace={activeSpace} selected={selected} setSelected={setSelected} onUpdate={updateTask} settings={safeSettings} />)}
                {view === "board" && <BoardView tasks={filtered} selected={selected} setSelected={setSelected} onUpdate={updateTask} settings={safeSettings} />}
                {view === "calendar" && <CalendarView tasks={filtered} />}
                {view === "Goals" && <GoalsView activeSpace={activeSpace} />}
                {view === "documents" && <DocumentsView activeSpace={activeSpace} settings={safeSettings} />}
                {view === "daily report" && activeSpace === "mopas" && <DailyReportView />}
                {view === "tender folder" && activeSpace === "mopas" && <TenderFolderCreator />}
              </div>
              {(view === "list" || view === "board") && <TaskDetail task={selected} onUpdate={updateTask} onDelete={deleteTask} />}
            </div>
          )}
        </div>
      </main>

      {showNewTask && <NewTaskModal space={activeSpace} onSave={createTask} onClose={() => setShowNewTask(false)} />}
      {showEndDayReview && (
        <EndDayReviewModal
          tasks={tasks}
          onClose={() => setShowEndDayReview(false)}
          onSaveReview={saveEndDayReview}
          onMoveNormalToTomorrow={moveUnfinishedNormalTasksToTomorrow}
          onGenerateTomorrowRoutines={generateTomorrowRoutineTasks}
        />
      )}
    </div>
  );
}

class AfterglowErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError:false, message:"" };
  }
  static getDerivedStateFromError(error) {
    return { hasError:true, message:String(error && error.message ? error.message : error || "Unknown app error") };
  }
  componentDidCatch(error, info) {
    try { console.error("AFTERGLOW screen error", error, info); } catch {}
  }
  render() {
    if (!this.state.hasError) return this.props.children;
    const resetSettings = () => {
      try { window.localStorage.removeItem(APP_SETTINGS_KEY); } catch {}
      window.location.reload();
    };
    return (
      <div style={{ minHeight:"100vh", background:"#1a1a1a", color:"#f5f0e8", display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"Segoe UI, Helvetica Neue, sans-serif" }}>
        <div style={{ maxWidth:560, width:"100%", background:"#232323", border:"1px solid #3a3a3a", borderRadius:16, padding:24, boxShadow:"0 24px 70px #0008" }}>
          <div style={{ color:"#d4a853", fontSize:12, letterSpacing:2, fontWeight:800 }}>AFTERGLOW RECOVERY</div>
          <h2 style={{ margin:"8px 0 8px", color:"#f5f0e8" }}>The screen was protected from turning white.</h2>
          <p style={{ color:"#b8b0a0", lineHeight:1.6 }}>A saved setting or old task caused a render error. You can reload first. If it returns, reset settings only; your tasks, documents, reports, and uploaded file references will stay safe.</p>
          <div style={{ background:"#1a1a1a", border:"1px solid #3a3a3a", borderRadius:10, padding:12, color:"#e05555", fontSize:12, margin:"14px 0", wordBreak:"break-word" }}>{this.state.message}</div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <button onClick={() => window.location.reload()} style={{ padding:"9px 16px", borderRadius:8, border:"none", background:"#e8732a", color:"#fff", fontWeight:800, cursor:"pointer" }}>Reload app</button>
            <button onClick={resetSettings} style={{ padding:"9px 16px", borderRadius:8, border:"1px solid #3a3a3a", background:"transparent", color:"#f5f0e8", fontWeight:800, cursor:"pointer" }}>Reset settings only</button>
          </div>
        </div>
      </div>
    );
  }
}

export default function App() {
  return (
    <AfterglowErrorBoundary>
      <AfterglowApp />
    </AfterglowErrorBoundary>
  );
}
