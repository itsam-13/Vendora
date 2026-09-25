const request = require('supertest');
const app = require('../Src/app');
const userModel = require('../Src/Model/user.model');
const dbHandler = require('./setupDb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- DB lifecycle ---

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => {
  await dbHandler.clearDatabase();
});

afterAll(async () => {
  await dbHandler.closeDatabase();
});

// --- Helpers ---

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.JWT_SECRET_KEY ||
  'default_jwt_secret';

const seedUserAndGetToken = async (overrides = {}) => {
  const userData = {
    username: 'logoutuser',
    email: 'logoutuser@example.com',
    password: 'Password@123',
    fullName: { firstName: 'Logout', lastName: 'User' },
    role: 'user',
    ...overrides,
  };
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const user = await userModel.create({ ...userData, password: hashedPassword });
  const token = jwt.sign(
    { id: user._id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
  return { user, token };
};

// --- Tests ---

describe('GET /api/auth/logout', () => {

  describe('Successful Logout', () => {

    it('should return 200 with success:true when a valid token cookie is present', async () => {
      const { token } = await seedUserAndGetToken();
      const response = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', `token=${token}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toMatch(/logged out/i);
    });

    it('should clear the token cookie (Set-Cookie header with expired/empty value)', async () => {
      const { token } = await seedUserAndGetToken();
      const response = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', `token=${token}`);
      expect(response.status).toBe(200);
      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
      const tokenCookie = setCookieHeader.find((c) => c.startsWith('token='));
      expect(tokenCookie).toBeDefined();
      const isCleared =
        tokenCookie.includes('Expires=Thu, 01 Jan 1970') ||
        tokenCookie.includes('expires=Thu, 01 Jan 1970') ||
        tokenCookie.includes('Max-Age=0') ||
        tokenCookie.startsWith('token=;');
      expect(isCleared).toBe(true);
    });

    it('should not return sensitive data (token, user, password) in the response body', async () => {
      const { token } = await seedUserAndGetToken();
      const response = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', `token=${token}`);
      expect(response.status).toBe(200);
      expect(response.body).not.toHaveProperty('token');
      expect(response.body).not.toHaveProperty('user');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should work for users with the seller role', async () => {
      const { token } = await seedUserAndGetToken({
        username: 'adminlogout',
        email: 'adminlogout@example.com',
        role: 'seller',
      });
      const response = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', `token=${token}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

  });

  describe('Unauthorized Access', () => {

    it('should return 401 when no auth cookie is provided', async () => {
      const response = await request(app).get('/api/auth/logout');
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 401 when the token cookie is a malformed JWT string', async () => {
      const response = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', 'token=this.is.not.a.valid.jwt');
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 401 when the token is signed with a wrong secret', async () => {
      const { user } = await seedUserAndGetToken();
      const tampered = jwt.sign(
        { id: user._id, username: user.username, email: user.email, role: user.role },
        'completely_wrong_secret',
        { expiresIn: '1d' }
      );
      const response = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', `token=${tampered}`);
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 401 when the token is expired', async () => {
      const { user } = await seedUserAndGetToken();
      const expiredToken = jwt.sign(
        { id: user._id, username: user.username, email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: '0s' }
      );
      const response = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', `token=${expiredToken}`);
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should return 401 when the cookie value is empty', async () => {
      const response = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', 'token=');
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

  });

  describe('Post-logout behaviour', () => {

    it('/me should return 401 after logout when no cookie is sent (client-side cleared)', async () => {
      const { token } = await seedUserAndGetToken();
      const logoutRes = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', `token=${token}`);
      expect(logoutRes.status).toBe(200);
      const meRes = await request(app).get('/api/auth/me');
      expect(meRes.status).toBe(401);
    });

  });

});
