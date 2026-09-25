const request = require('supertest');
const app = require('../Src/app');
const userModel = require('../Src/Model/user.model');
const dbHandler = require('./setupDb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ─── DB lifecycle ─────────────────────────────────────────────────────────────

beforeAll(async () => {
  await dbHandler.connect();
});

afterEach(async () => {
  await dbHandler.clearDatabase();
});

afterAll(async () => {
  await dbHandler.closeDatabase();
});

// ─── Helper ───────────────────────────────────────────────────────────────────

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.JWT_SECRET_KEY ||
  'default_jwt_secret';

const seedUserAndGetToken = async () => {
  const hashedPassword = await bcrypt.hash('Password@123', 10);

  const user = await userModel.create({
    username: 'meuser',
    email: 'meuser@example.com',
    password: hashedPassword,
    fullName: { firstName: 'Me', lastName: 'User' },
    role: 'user',
  });

  const token = jwt.sign(
    { id: user._id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  return { user, token };
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {

  it('should return 200 and the current user when a valid token cookie is present', async () => {
    const { user, token } = await seedUserAndGetToken();

    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', `token=${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).toMatchObject({
      username: user.username,
      email: user.email,
      role: user.role,
    });
    // password must never be exposed
    expect(response.body.user).not.toHaveProperty('password');
  });

  it('should return 401 when no auth cookie is provided', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('success', false);
  });

  it('should return 401 when the token cookie is invalid', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'token=this.is.not.a.valid.token');

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('success', false);
  });

});
