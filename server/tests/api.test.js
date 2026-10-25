// server/tests/api.test.js
// Comprehensive Jest & Supertest API integration test suite covering:
//   - Health check
//   - Auth flow (Registration, Login, Protected Profile, Logout)
//   - Exam lifecycle & Question editor (Teacher CRUD, Publish, Analytics)
//   - Exam attempt lifecycle (Start, Auto-save answers, Auto-grading, Submit)
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const env = require('../src/config/env');
const connectDB = require('../src/config/db');
const User = require('../src/models/User');
const Exam = require('../src/models/Exam');
const Question = require('../src/models/Question');
const ExamAttempt = require('../src/models/ExamAttempt');

jest.setTimeout(30000);

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }
}, 30000);

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}, 30000);

describe('Online Examination & Proctoring System API Test Suite', () => {
  // ─── 1. Health Check ────────────────────────────────────────────────────────
  describe('Health Check Endpoint', () => {
    it('GET /api/health should return 200 and healthy status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Server is healthy');
    });
  });

  // ─── 2. Authentication Flow ────────────────────────────────────────────────
  describe('Authentication Flow', () => {
    const testEmail = `test_${Date.now()}@college.edu`;
    const testPassword = 'Password@1234!';
    let authCookie = null;

    it('POST /api/auth/register should create a new student account', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Integration Test Student',
          email: testEmail,
          password: testPassword,
          role: 'STUDENT',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const registeredUser = res.body.data.user || res.body.data;
      expect(registeredUser.email).toBe(testEmail.toLowerCase());
      expect(registeredUser.role).toBe('STUDENT');
    });

    it('POST /api/auth/register should reject duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Duplicate Student',
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('POST /api/auth/login should authenticate user and issue cookies', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.headers['set-cookie']).toBeDefined();

      // Extract access token cookie
      authCookie = res.headers['set-cookie'];
    });

    it('GET /api/auth/me should return authenticated user profile with valid cookie', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const profileUser = res.body.data.user || res.body.data;
      expect(profileUser.email).toBe(testEmail.toLowerCase());
    });

    it('GET /api/auth/me should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('POST /api/auth/logout should clear session cookies', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', authCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ─── 3. Teacher Exam Lifecycle & Analytics ──────────────────────────────────
  describe('Teacher Exam Lifecycle & Analytics', () => {
    let teacherCookie = null;
    let createdExamId = null;
    let createdQuestionId = null;

    beforeAll(async () => {
      // Login as Prof. Ahmad
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'prof.ahmad@college.edu',
          password: 'Teacher@1234!',
        });

      teacherCookie = loginRes.headers['set-cookie'];
    }, 20000);

    it('POST /api/exams should allow teacher to create a DRAFT exam', async () => {
      const startTime = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const endTime = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();

      const res = await request(app)
        .post('/api/exams')
        .set('Cookie', teacherCookie)
        .send({
          title: 'Automated Test Exam - Algorithms',
          description: 'Testing exam creation and auto-grading',
          durationMinutes: 45,
          startTime,
          endTime,
          maximumMarks: 10,
          proctoring: {
            enabled: true,
            tabSwitchDetection: true,
            fullscreenRequired: false,
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('DRAFT');
      createdExamId = res.body.data._id;
    });

    it('POST /api/exams/:id/questions should add an MCQ question with options', async () => {
      const res = await request(app)
        .post(`/api/exams/${createdExamId}/questions`)
        .set('Cookie', teacherCookie)
        .send({
          type: 'MCQ_SINGLE',
          text: 'What is the time complexity of binary search on a sorted array?',
          marks: 5,
          options: [
            { text: 'O(1)' },
            { text: 'O(log n)' },
            { text: 'O(n)' },
            { text: 'O(n log n)' },
          ],
          answerKey: {
            sampleAnswer: 'O(log n)',
          },
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.options.length).toBe(4);
      createdQuestionId = res.body.data._id;
    });

    it('PATCH /api/exams/:id/publish should publish the exam when questions exist', async () => {
      const res = await request(app)
        .patch(`/api/exams/${createdExamId}/publish`)
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('PUBLISHED');
    });

    it('GET /api/exams/:id/analytics should return exam analytics structure', async () => {
      const res = await request(app)
        .get(`/api/exams/${createdExamId}/analytics`)
        .set('Cookie', teacherCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overview).toBeDefined();
      expect(res.body.data.questionAnalytics).toBeDefined();
    });
  });

  // ─── 4. Student Examination & Auto-Grading ──────────────────────────────────
  describe('Student Examination & Auto-Grading Flow', () => {
    let studentCookie = null;
    let publishedExam = null;
    let attemptId = null;
    let firstQuestion = null;

    beforeAll(async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'jane.student@examportal.dev',
          password: 'Student@1234!',
        });
      studentCookie = loginRes.headers['set-cookie'];
    });

    it('GET /api/exams should return published exams for student', async () => {
      const res = await request(app)
        .get('/api/exams')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.exams.length).toBeGreaterThan(0);
      publishedExam = res.body.data.exams[0];
    });

    it('POST /api/attempts/start should start or resume an attempt and return questions without answerKey', async () => {
      const res = await request(app)
        .post('/api/attempts/start')
        .set('Cookie', studentCookie)
        .send({ examId: publishedExam._id });

      expect(res.status).toBeOneOf ? expect(res.status).toBeOneOf([200, 201]) : expect([200, 201]).toContain(res.status);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attempt).toBeDefined();
      expect(res.body.data.questions.length).toBeGreaterThan(0);

      // Verify answer key is not leaked to student
      res.body.data.questions.forEach(q => {
        expect(q.answerKey).toBeUndefined();
      });

      attemptId = res.body.data.attempt._id;
      firstQuestion = res.body.data.questions[0];
    });

    it('PUT /api/attempts/:id/save should auto-save student answers', async () => {
      const selectedOptId = firstQuestion.options?.[0]?._id;
      const res = await request(app)
        .put(`/api/attempts/${attemptId}/save`)
        .set('Cookie', studentCookie)
        .send({
          answers: [
            {
              questionId: firstQuestion._id,
              selectedOptionIds: selectedOptId ? [selectedOptId] : [],
              textAnswer: 'Auto-saved test answer',
            },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.savedCount).toBeGreaterThan(0);
    });

    it('POST /api/attempts/:id/events should record proctoring violation', async () => {
      const res = await request(app)
        .post(`/api/attempts/${attemptId}/events`)
        .set('Cookie', studentCookie)
        .send({
          eventType: 'TAB_HIDDEN',
          durationMs: 800,
          description: 'Automated test tab blur',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.eventType).toBe('TAB_HIDDEN');
    });

    it('POST /api/attempts/:id/submit should submit attempt and evaluate objective questions', async () => {
      const res = await request(app)
        .post(`/api/attempts/${attemptId}/submit`)
        .set('Cookie', studentCookie)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('SUBMITTED');
      expect(res.body.data.evaluationStatus).toBeDefined();
    });

    it('GET /api/attempts/my should list student attempt history', async () => {
      const res = await request(app)
        .get('/api/attempts/my')
        .set('Cookie', studentCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attempts.length).toBeGreaterThan(0);
    });
  });
});
