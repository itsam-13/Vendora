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

describe('POST /auth/register', () => {
  const validUserData = {
    username: 'testuser',
    email: 'testuser@example.com',
    password: 'Password@123',
    fullName: {
      firstName: 'Test',
      lastName: 'User',
    },
    role: 'user',
  };

  it('should successfully register a new user and return status 201', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(validUserData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('message', 'User registered successfully');
    expect(response.body).toHaveProperty('token');
    expect(typeof response.body.token).toBe('string');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user.username).toBe(validUserData.username.toLowerCase());
    expect(response.body.user.email).toBe(validUserData.email.toLowerCase());
    expect(response.body.user.fullName.firstName).toBe(validUserData.fullName.firstName);
    expect(response.body.user).not.toHaveProperty('password');

    // Verify user is saved in the in-memory database
    const savedUser = await userModel.findOne({ email: validUserData.email.toLowerCase() }).select('+password');
    expect(savedUser).not.toBeNull();
    expect(savedUser.username).toBe(validUserData.username.toLowerCase());
    
    // Verify password is encrypted, not stored in plain text
    expect(savedUser.password).not.toBe(validUserData.password);
    const isPasswordValid = await bcrypt.compare(validUserData.password, savedUser.password);
    expect(isPasswordValid).toBe(true);
  });

  it('should return 400 if required fields are missing', async () => {
    // Missing email
    const resNoEmail = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'noemail',
        password: 'Password@123',
        fullName: { firstName: 'No', lastName: 'Email' },
      });
    expect(resNoEmail.status).toBe(400);

    // Missing password
    const resNoPass = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'nopass',
        email: 'nopass@example.com',
        fullName: { firstName: 'No', lastName: 'Pass' },
      });
    expect(resNoPass.status).toBe(400);

    // Missing fullName
    const resNoName = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'noname',
        email: 'noname@example.com',
        password: 'Password@123',
      });
    expect(resNoName.status).toBe(400);
  });

  it('should return 409 if a user with the same email already exists', async () => {
    // First registration
    await request(app).post('/auth/register').send(validUserData);

    // Duplicate email registration attempt
    const duplicateEmailUser = {
      ...validUserData,
      username: 'different_username',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(duplicateEmailUser);

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/already exists/i);
  });

  it('should return 409 if a user with the same username already exists', async () => {
    // First registration
    await request(app).post('/auth/register').send(validUserData);

    // Duplicate username registration attempt
    const duplicateUsernameUser = {
      ...validUserData,
      email: 'different_email@example.com',
    };

    const response = await request(app)
      .post('/api/auth/register')
      .send(duplicateUsernameUser);

    expect(response.status).toBe(409);
    expect(response.body.message).toMatch(/already exists/i);
  });
});
