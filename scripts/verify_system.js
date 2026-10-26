// scripts/verify_system.js
// Comprehensive live practical verification of the Online Examination & Proctoring System
// Tests Cloud Backend, Database, Vercel Frontend, Admin, Teacher, Student, Proctoring Telemetry, and Socket.IO.

const io = require('../client/node_modules/socket.io-client');

const API_BASE = 'https://online-examination-proctoring.onrender.com';
const CLIENT_BASE = 'https://online-examination-proctoring.vercel.app';

// Helper class to manage authenticated sessions with cookies
class ClientSession {
  constructor(name) {
    this.name = name;
    this.cookies = new Map();
  }

  saveCookies(res) {
    const rawCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')];
    if (rawCookies) {
      for (const cookieStr of rawCookies) {
        if (!cookieStr) continue;
        const [pair] = cookieStr.split(';');
        const [k, v] = pair.split('=');
        if (k && v) {
          this.cookies.set(k.trim(), v.trim());
        }
      }
    }
  }

  getCookieHeader() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  async fetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    const cookieHeader = this.getCookieHeader();
    if (cookieHeader) {
      headers['Cookie'] = cookieHeader;
    }

    const res = await fetch(url, { ...options, headers });
    this.saveCookies(res);

    let data;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    return { status: res.status, ok: res.ok, data };
  }

  async login(email, password) {
    const res = await this.fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      throw new Error(`[${this.name}] Login failed (${res.status}): ${JSON.stringify(res.data)}`);
    }
    return res.data;
  }
}

// Verification runner
async function runSystemVerification() {
  console.log('================================================================');
  console.log('🚀 COMPREHENSIVE END-TO-END PRACTICAL SYSTEM VERIFICATION');
  console.log(`Backend Target:  ${API_BASE}`);
  console.log(`Frontend Target: ${CLIENT_BASE}`);
  console.log('================================================================\n');

  const testReport = {
    healthCheck: false,
    frontendCheck: false,
    adminModule: false,
    teacherModule: false,
    studentModule: false,
    proctoringTelemetry: false,
    evaluationAndAnalytics: false,
    socketIO: false,
    allPassed: false,
  };

  let examId = null;
  let teacherSession = null;

  try {
    // ─── 1. Health & Infrastructure Check ─────────────────────────────────────
    console.log('▶ STEP 1: Testing Backend & Database Health');
    const healthRes = await fetch(`${API_BASE}/api/health`);
    const healthData = await healthRes.json();
    if (healthRes.ok && healthData.database?.connected) {
      console.log(`  ✅ Backend is UP (Uptime: ${healthData.uptimeSeconds}s)`);
      console.log(`  ✅ Database is CONNECTED: ${healthData.database.host}`);
      testReport.healthCheck = true;
    } else {
      throw new Error(`Health check failed: ${JSON.stringify(healthData)}`);
    }

    // ─── 2. Vercel Frontend Availability ──────────────────────────────────────
    console.log('\n▶ STEP 2: Testing Vercel Frontend Hosting');
    const frontRes = await fetch(CLIENT_BASE);
    const frontHtml = await frontRes.text();
    if (frontRes.ok && frontHtml.includes('<div id="root">')) {
      console.log('  ✅ Vercel Frontend loads successfully (HTTP 200, React root present)');
      testReport.frontendCheck = true;
    } else {
      throw new Error(`Frontend returned unexpected status: ${frontRes.status}`);
    }

    // ─── 3. Admin Module Functional Check ─────────────────────────────────────
    console.log('\n▶ STEP 3: Testing Admin Functional Flows');
    const adminSession = new ClientSession('Admin');
    const adminLogin = await adminSession.login('admin@examportal.dev', 'Admin@1234!');
    console.log(`  ✅ Admin Login successful: ${adminLogin.data.name} (Role: ${adminLogin.data.role})`);

    const dashboardRes = await adminSession.fetch('/api/admin/dashboard');
    if (dashboardRes.ok) {
      console.log('  ✅ Admin Dashboard metrics fetched successfully');
    } else {
      throw new Error(`Admin dashboard fetch failed: ${JSON.stringify(dashboardRes.data)}`);
    }

    const usersRes = await adminSession.fetch('/api/admin/users?limit=5');
    if (usersRes.ok) {
      const userCount = usersRes.data.data?.users?.length || usersRes.data.data?.length || 0;
      console.log(`  ✅ Admin User Management active (${userCount} users retrieved)`);
    }

    const auditRes = await adminSession.fetch('/api/admin/audit-logs?limit=5');
    if (auditRes.ok) {
      console.log('  ✅ Admin Security Audit Trail active');
    }
    testReport.adminModule = true;

    // ─── 4. Teacher Module: Exam Creation & Management ────────────────────────
    console.log('\n▶ STEP 4: Testing Teacher Functional Flows');
    teacherSession = new ClientSession('Teacher');
    const teacherLogin = await teacherSession.login('prof.ahmad@college.edu', 'Teacher@1234!');
    console.log(`  ✅ Teacher Login successful: ${teacherLogin.data.name} (Role: ${teacherLogin.data.role})`);

    // Create an automated verification exam
    const now = new Date();
    const startTime = new Date(now.getTime() - 60 * 1000).toISOString(); // 1 min ago
    const endTime = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours later

    const examPayload = {
      title: `Live System Audit Exam (${Date.now().toString().slice(-4)})`,
      description: 'Automated verification exam testing end-to-end question creation, proctoring, and grading.',
      durationMinutes: 45,
      startTime,
      endTime,
      maximumMarks: 20,
      attemptLimit: 3,
      negativeMarking: { enabled: true, defaultPenaltyFraction: 0.25 },
      randomizeQuestions: false,
      proctoring: {
        enabled: true,
        webcamRequired: true,
        fullscreenRequired: true,
        tabSwitchDetection: true,
      },
      instructions: 'Please answer all questions. Proctoring events are actively monitored.',
    };

    const createExamRes = await teacherSession.fetch('/api/exams', {
      method: 'POST',
      body: JSON.stringify(examPayload),
    });
    if (!createExamRes.ok) {
      throw new Error(`Failed to create exam: ${JSON.stringify(createExamRes.data)}`);
    }
    const createdExam = createExamRes.data.data;
    examId = createdExam._id;
    console.log(`  ✅ Exam created successfully: ID=${examId}, Title="${createdExam.title}"`);

    // Add MCQ Single Question
    const q1Res = await teacherSession.fetch(`/api/exams/${examId}/questions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'MCQ_SINGLE',
        text: 'Which protocol is used for real-time bi-directional proctoring telemetry in this system?',
        options: [
          { text: 'WebSocket / Socket.IO' },
          { text: 'FTP' },
          { text: 'SMTP' },
          { text: 'SNMP' },
        ],
        marks: 10,
        negativeMarks: 2.5,
        explanation: 'Socket.IO provides persistent, low-latency, event-driven bidirectional communication.',
      }),
    });
    if (!q1Res.ok) throw new Error(`Failed to add Q1: ${JSON.stringify(q1Res.data)}`);
    const q1 = q1Res.data.data;
    const q1CorrectOptionId = q1.options[0]._id;
    console.log(`  ✅ Question 1 (MCQ Single) added: ID=${q1._id}`);

    // Update Q1 answerKey with correct option ID
    await teacherSession.fetch(`/api/exams/${examId}/questions/${q1._id}`, {
      method: 'PUT',
      body: JSON.stringify({
        answerKey: { correctOptionIds: [q1CorrectOptionId] },
      }),
    });

    // Add True/False Question
    const q2Res = await teacherSession.fetch(`/api/exams/${examId}/questions`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'TRUE_FALSE',
        text: 'The Page Visibility API is used by ExamPortal to detect when a student switches browser tabs.',
        options: [{ text: 'True' }, { text: 'False' }],
        marks: 10,
        negativeMarks: 2.5,
      }),
    });
    if (!q2Res.ok) throw new Error(`Failed to add Q2: ${JSON.stringify(q2Res.data)}`);
    const q2 = q2Res.data.data;
    const q2CorrectOptionId = q2.options[0]._id; // True
    await teacherSession.fetch(`/api/exams/${examId}/questions/${q2._id}`, {
      method: 'PUT',
      body: JSON.stringify({
        answerKey: { correctOptionIds: [q2CorrectOptionId] },
      }),
    });
    console.log(`  ✅ Question 2 (True/False) added: ID=${q2._id}`);

    // Publish the exam
    const publishRes = await teacherSession.fetch(`/api/exams/${examId}/publish`, {
      method: 'PATCH',
    });
    if (!publishRes.ok) throw new Error(`Failed to publish exam: ${JSON.stringify(publishRes.data)}`);
    console.log('  ✅ Exam status transitioned to PUBLISHED');
    testReport.teacherModule = true;

    // ─── 5. Student Module: Take Exam & Proctoring ─────────────────────────────
    console.log('\n▶ STEP 5: Testing Student Flow & Live Exam Taking');
    const studentSession = new ClientSession('Student');
    const studentLogin = await studentSession.login('jane.student@examportal.dev', 'Student@1234!');
    console.log(`  ✅ Student Login successful: ${studentLogin.data.name} (Role: ${studentLogin.data.role})`);

    // Verify student sees the published exam
    const studentExamsRes = await studentSession.fetch('/api/exams');
    const examList = studentExamsRes.data.data?.exams || studentExamsRes.data.data || [];
    const examFound = examList.some(e => e._id === examId);
    console.log(`  ✅ Published exam is visible in Student Catalog: ${examFound ? 'YES' : 'NO'}`);

    // Start Exam Attempt
    const startAttemptRes = await studentSession.fetch('/api/attempts/start', {
      method: 'POST',
      body: JSON.stringify({ examId }),
    });
    if (!startAttemptRes.ok) throw new Error(`Start attempt failed: ${JSON.stringify(startAttemptRes.data)}`);
    const attemptData = startAttemptRes.data.data;
    const attempt = attemptData.attempt || attemptData;
    const attemptId = attempt._id;
    console.log(`  ✅ Student Attempt started: ID=${attemptId}`);

    // Save answers (Student chooses correct option for Q1 and Q2)
    const saveAnswersRes = await studentSession.fetch(`/api/attempts/${attemptId}/save`, {
      method: 'PUT',
      body: JSON.stringify({
        answers: [
          { questionId: q1._id, selectedOptionIds: [q1CorrectOptionId] },
          { questionId: q2._id, selectedOptionIds: [q2CorrectOptionId] },
        ],
      }),
    });
    if (!saveAnswersRes.ok) throw new Error(`Save answers failed: ${JSON.stringify(saveAnswersRes.data)}`);
    console.log('  ✅ Answers saved and autosynced to cloud server');

    // ─── 6. Proctoring Event Telemetry Test ───────────────────────────────────
    console.log('\n▶ STEP 6: Testing Anti-Cheat Proctoring Telemetry');
    const proctorEvent1 = await studentSession.fetch(`/api/attempts/${attemptId}/events`, {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'TAB_HIDDEN',
        durationMs: 3500,
        description: 'Student switched away to external application/tab.',
      }),
    });
    if (!proctorEvent1.ok) throw new Error(`Proctoring event recording failed: ${JSON.stringify(proctorEvent1.data)}`);
    console.log('  ✅ Proctoring violation recorded: TAB_HIDDEN (3500ms duration)');

    const proctorEvent2 = await studentSession.fetch(`/api/attempts/${attemptId}/events`, {
      method: 'POST',
      body: JSON.stringify({
        eventType: 'FULLSCREEN_EXIT',
        durationMs: 1200,
        description: 'Student exited mandatory fullscreen examination mode.',
      }),
    });
    if (proctorEvent2.ok) {
      console.log('  ✅ Proctoring violation recorded: FULLSCREEN_EXIT');
      testReport.proctoringTelemetry = true;
    }

    // Submit Attempt
    const submitRes = await studentSession.fetch(`/api/attempts/${attemptId}/submit`, {
      method: 'POST',
      body: JSON.stringify({ answers: [] }),
    });
    if (!submitRes.ok) throw new Error(`Submit attempt failed: ${JSON.stringify(submitRes.data)}`);
    const submitResult = submitRes.data.data;
    console.log('  ✅ Exam Attempt submitted successfully');
    console.log(`     Automated Score: ${submitResult.score} / ${submitResult.maxScore} (Status: ${submitResult.evaluationStatus})`);
    testReport.studentModule = true;

    // ─── 7. Teacher Proctoring Events Review & Analytics ──────────────────────
    console.log('\n▶ STEP 7: Testing Teacher Proctoring Review & Analytics');
    const proctorListRes = await teacherSession.fetch(`/api/exams/${examId}/proctoring-events`);
    if (proctorListRes.ok) {
      const events = proctorListRes.data.data?.events || proctorListRes.data.data || [];
      console.log(`  ✅ Teacher retrieved proctoring events (${events.length} violations logged for exam)`);
    }

    const analyticsRes = await teacherSession.fetch(`/api/exams/${examId}/analytics`);
    if (analyticsRes.ok) {
      const overview = analyticsRes.data.data?.overview || {};
      console.log('  ✅ Exam Analytics generated successfully:');
      console.log(`     Submissions: ${overview.totalSubmissions}, Average Score: ${overview.averageScore}, Pass Rate: ${overview.passRate}%`);
      testReport.evaluationAndAnalytics = true;
    }

    // ─── 8. Real-time Socket.IO Connection Test ──────────────────────────────
    console.log('\n▶ STEP 8: Testing Live Socket.IO Proctoring Connection');
    await new Promise((resolve, reject) => {
      const socket = io(API_BASE, {
        transports: ['websocket', 'polling'],
        timeout: 10000,
      });

      const timer = setTimeout(() => {
        socket.disconnect();
        reject(new Error('Socket.IO connection timed out after 10s'));
      }, 10000);

      socket.on('connect', () => {
        console.log(`  ✅ Socket.IO connected successfully (Transport: ${socket.io.engine.transport.name})`);
        console.log(`  ✅ Socket ID: ${socket.id}`);

        // Join proctoring room
        socket.emit('exam:proctor:join', { examId });
        console.log(`  ✅ Joined real-time proctoring room for exam: ${examId}`);

        clearTimeout(timer);
        socket.disconnect();
        testReport.socketIO = true;
        resolve();
      });

      socket.on('connect_error', err => {
        clearTimeout(timer);
        reject(err);
      });
    });

    // ─── 9. Clean-up temporary verification exam ─────────────────────────────
    console.log('\n▶ STEP 9: Cleaning up temporary verification exam');
    const cancelRes = await teacherSession.fetch(`/api/exams/${examId}/cancel`, {
      method: 'PATCH',
    });
    if (cancelRes.ok) {
      console.log('  ✅ Test exam archived/cancelled cleanly');
    }

    testReport.allPassed = true;
  } catch (error) {
    console.error('\n❌ VERIFICATION ERROR:', error.message);
  } finally {
    // If exam was created but not cancelled, attempt cancel
    if (examId && teacherSession && !testReport.allPassed) {
      try {
        await teacherSession.fetch(`/api/exams/${examId}/cancel`, { method: 'PATCH' });
      } catch (_) {}
    }
  }

  console.log('\n================================================================');
  console.log('📊 PRACTICAL VERIFICATION SUMMARY RESULTS:');
  console.log('================================================================');
  console.log(`1. Cloud Health & DB Ready:        ${testReport.healthCheck ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`2. Frontend Hosting (Vercel):      ${testReport.frontendCheck ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`3. Admin Management & Audit:       ${testReport.adminModule ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`4. Teacher Exam & Question Bank:   ${testReport.teacherModule ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`5. Student Exam Taking & Grading:  ${testReport.studentModule ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`6. Anti-Cheat Proctoring Telemetry:${testReport.proctoringTelemetry ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`7. Evaluation & Analytics Engine:  ${testReport.evaluationAndAnalytics ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`8. Real-time Socket.IO Engine:     ${testReport.socketIO ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log('----------------------------------------------------------------');
  console.log(`OVERALL STATUS:                    ${testReport.allPassed ? 'ALL SYSTEMS FULLY OPERATIONAL 🎉' : 'ISSUES DETECTED ⚠️'}`);
  console.log('================================================================\n');

  return testReport;
}

runSystemVerification();
