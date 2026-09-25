const request = require('supertest');
const app = require('../Src/app');
const userModel = require('../Src/Model/user.model');
const dbHandler = require('./setupDb');
const bcrypt = require('bcryptjs');

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => {
  await dbHandler.clearDatabase();
});

afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe('POST /api/auth/login', () => {
  const defaultUserData = {
    username: 'testuser',
    email: 'testuser@example.com',
    password: 'Password@123',
    fullName: {
      firstName: 'Test',
      lastName: 'User',
    },
    role: 'user',
  };

  // Helper function to seed a user into the test database
  const seedUser = async (customData = {}) => {
    const userData = { ...defaultUserData, ...customData };
    const hashedPassword = await bcrypt.hash(userData.password, 10);
    return await userModel.create({
      ...userData,
      password: hashedPassword,
    });
  };

  describe('Successful Logins', () => {
    beforeEach(async () => {
      await seedUser();
    });

    it('should successfully login with valid email and password, returning 200, JWT token, user data, and auth cookie', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: defaultUserData.email,
          password: defaultUserData.password,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');

      // Verify user object in response body
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toMatchObject({
        username: defaultUserData.username,
        email: defaultUserData.email,
        role: defaultUserData.role,
        fullName: {
          firstName: defaultUserData.fullName.firstName,
          lastName: defaultUserData.fullName.lastName,
        },
      });
      expect(response.body.user).not.toHaveProperty('password');

      // Verify auth cookie is set
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie) => cookie.includes('token='))).toBe(true);
    });

    it('should successfully login with valid username and password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: defaultUserData.username,
          password: defaultUserData.password,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(typeof response.body.token).toBe('string');
      expect(response.body.user.username).toBe(defaultUserData.username);
      expect(response.body.user.email).toBe(defaultUserData.email);
    });

    it('should handle case-insensitive email and username logins', async () => {
      // Login with uppercase email
      const emailResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: defaultUserData.email.toUpperCase(),
          password: defaultUserData.password,
        });

      expect(emailResponse.status).toBe(200);
      expect(emailResponse.body.user.email).toBe(defaultUserData.email);

      // Login with uppercase username
      const usernameResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: defaultUserData.username.toUpperCase(),
          password: defaultUserData.password,
        });

      expect(usernameResponse.status).toBe(200);
      expect(usernameResponse.body.user.username).toBe(defaultUserData.username);
    });
  });

  describe('Authentication Failures (Invalid Credentials)', () => {
    beforeEach(async () => {
      await seedUser();
    });

    it('should return 401 when the password is incorrect for an existing email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: defaultUserData.email,
          password: 'WrongPassword@999',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/invalid credentials|incorrect password/i);
      expect(response.body).not.toHaveProperty('token');
    });

    it('should return 401 when the password is incorrect for an existing username', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: defaultUserData.username,
          password: 'WrongPassword@999',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/invalid credentials|incorrect password/i);
      expect(response.body).not.toHaveProperty('token');
    });

    it('should return 401 when the email does not exist in the database', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: defaultUserData.password,
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/invalid credentials|user not found/i);
      expect(response.body).not.toHaveProperty('token');
    });

    it('should return 401 when the username does not exist in the database', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistentuser',
          password: defaultUserData.password,
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/invalid credentials|user not found/i);
      expect(response.body).not.toHaveProperty('token');
    });
  });

  describe('Validation Failures (Missing or Invalid Request Payload)', () => {
    it('should return 400 if neither email nor username is provided', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: defaultUserData.password,
        });

      expect(response.status).toBe(400);
    });

    it('should return 400 if password is missing', async () => {
      const responseWithEmail = await request(app)
        .post('/api/auth/login')
        .send({
          email: defaultUserData.email,
        });

      expect(responseWithEmail.status).toBe(400);

      const responseWithUsername = await request(app)
        .post('/api/auth/login')
        .send({
          username: defaultUserData.username,
        });

      expect(responseWithUsername.status).toBe(400);
    });

    it('should return 400 if an empty body is sent', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });

    it('should return 400 if email is provided in an invalid format', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'not-an-email',
          password: defaultUserData.password,
        });

      expect(response.status).toBe(400);
    });
  });
});
