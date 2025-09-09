const request = require('supertest');
const { app, server } = require('../index');
const fs = require('fs').promises;
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../../data/items.json');

const mockItems = [
  { id: 1, name: 'Item 1', price: 10 },
  { id: 2, name: 'Item 2', price: 20 },
  { id: 3, name: 'Another Item', price: 30 },
];

beforeEach(async () => {
  await fs.writeFile(DATA_PATH, JSON.stringify(mockItems, null, 2));
});

afterAll(async () => {
  // Clean up the mock data file
  await fs.writeFile(DATA_PATH, JSON.stringify([], null, 2));
  if (server) {
    server.close();
  }
});

describe('Items API', () => {
  describe('GET /api/items', () => {
    it('should return a paginated list of items', async () => {
      const res = await request(app).get('/api/items?page=1&limit=2');
      expect(res.statusCode).toEqual(200);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(2);
      expect(res.body.data.length).toBe(2);
      expect(res.body.totalResults).toBe(3);
    });

    it('should filter items by a search query', async () => {
      const res = await request(app).get('/api/items?q=item');
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.length).toBe(3);
    });
  });

  describe('GET /api/items/:id', () => {
    it('should return a single item', async () => {
      const res = await request(app).get('/api/items/1');
      expect(res.statusCode).toEqual(200);
      expect(res.body.name).toBe('Item 1');
    });

    it('should return 404 for a non-existent item', async () => {
      const res = await request(app).get('/api/items/999');
      expect(res.statusCode).toEqual(404);
    });
  });

  describe('POST /api/items', () => {
    it('should create a new item', async () => {
      const newItem = { name: 'New Item', price: 40 };
      const res = await request(app)
        .post('/api/items')
        .send(newItem);

      expect(res.statusCode).toEqual(201);
      expect(res.body.name).toBe('New Item');

      const data = JSON.parse(await fs.readFile(DATA_PATH));
      expect(data.length).toBe(4);
    });

    it('should return 400 if name is missing', async () => {
      const newItem = { price: 40 };
      const res = await request(app)
        .post('/api/items')
        .send(newItem);

      expect(res.statusCode).toEqual(400);
    });

    it('should return 400 if price is missing', async () => {
      const newItem = { name: 'New Item' };
      const res = await request(app)
        .post('/api/items')
        .send(newItem);

      expect(res.statusCode).toEqual(400);
    });
  });
});
