const request = require('supertest');
const mongoose = require('mongoose');
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const JWT_SECRET =
  process.env.JWT_SECRET ||
  process.env.JWT_SECRET_KEY ||
  'default_jwt_secret';

const seedUserAndGetToken = async (customData = {}) => {
  const defaultData = {
    username: 'addressuser',
    email: 'addressuser@example.com',
    password: 'Password@123',
    fullName: { firstName: 'Address', lastName: 'Tester' },
    role: 'user',
  };
  const userData = { ...defaultData, ...customData };
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  const user = await userModel.create({ ...userData, password: hashedPassword });
  const token = jwt.sign(
    { id: user._id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '1d' }
  );
  return { user, token };
};

const sampleAddress = {
  street: '123 MG Road, Koramangala',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560034',
  phone: '9876543210',
  country: 'India',
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('User addresses API', () => {

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/auth/users/me/addresses
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /api/auth/users/me/addresses', () => {

    it('requires authentication (401 without cookie)', async () => {
      const response = await request(app).get('/auth/users/me/address');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    it('returns a list of addresses and indicates a default', async () => {
      const { user, token } = await seedUserAndGetToken();

      user.address.push({ ...sampleAddress, isDefault: true });
      await user.save();

      const response = await request(app)
        .get('/auth/users/me/address')
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.user.address)).toBe(true);
      expect(response.body.user.address).toHaveLength(1);
      expect(response.body.user.address[0].isDefault).toBe(true);
    });

  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/auth/users/me/addresses
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /api/auth/users/me/addresses', () => {

    it('validates pincode and phone and returns 400 on invalid input', async () => {
      const { token } = await seedUserAndGetToken();

      const response = await request(app)
        .post('/auth/users/me/address')
        .set('Cookie', `token=${token}`)
        .send({ ...sampleAddress, pincode: '123', phone: 'badphone' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('adds an address and can set it as default', async () => {
      const { user, token } = await seedUserAndGetToken();

      const response = await request(app)
        .post('/auth/users/me/address')
        .set('Cookie', `token=${token}`)
        .send({ ...sampleAddress, isDefault: true });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Address added successfully');
      expect(response.body.address).toMatchObject({
        street: sampleAddress.street,
        city: sampleAddress.city,
        state: sampleAddress.state,
        pincode: sampleAddress.pincode,
        country: sampleAddress.country,
      });
      expect(response.body.address.isDefault).toBe(true);

      const updatedUser = await userModel.findById(user._id);
      expect(updatedUser.address).toHaveLength(1);
      expect(updatedUser.address[0].isDefault).toBe(true);
    });

  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /api/auth/users/me/addresses/:addressId
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DELETE /api/auth/users/me/addresses/:addressId', () => {

    it('removes an address; returns 200 and updates list', async () => {
      const { user, token } = await seedUserAndGetToken();

      user.address.push({ ...sampleAddress, isDefault: true });
      await user.save();
      const addressId = user.address[0]._id.toString();

      const response = await request(app)
        .delete(`/auth/users/me/address/${addressId}`)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Address removed successfully');
      expect(response.body.addresses).toHaveLength(0);

      const updatedUser = await userModel.findById(user._id);
      expect(updatedUser.address).toHaveLength(0);
    });

    it('returns 404 when address not found', async () => {
      const { token } = await seedUserAndGetToken();
      const nonExistentId = new mongoose.Types.ObjectId().toString();

      const response = await request(app)
        .delete(`/auth/users/me/address/${nonExistentId}`)
        .set('Cookie', `token=${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.message).toMatch(/not found/i);
    });

  });

});
