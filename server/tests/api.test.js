const request = require('supertest');
const { app, server } = require('../index');
const mongoose = require('mongoose');

describe('Server API Health', () => {
    // Increase timeout for DB connection
    jest.setTimeout(30000);

    afterAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
        await server.close();
    });

    it('should return 200 for health check', async () => {
        const res = await request(app).get('/');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toBe('Server is up and running!');
    });

    it('should return pong for /ping', async () => {
        const res = await request(app).get('/ping');
        expect(res.statusCode).toEqual(200);
        expect(res.text).toBe('pong');
    });
});
