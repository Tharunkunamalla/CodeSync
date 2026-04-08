const { createServer } = require('http');
const { Server } = require('socket.io');
const Client = require('socket.io-client');
const { server } = require('../index');
const mongoose = require('mongoose');
const ACTIONS = require('../Actions');

describe('Socket.io Real-time Collaboration', () => {
    let io, serverSocket, clientSocket;
    const PORT = 5001; // Use a different port for testing

    beforeAll((done) => {
        server.listen(PORT, () => {
            clientSocket = new Client(`http://localhost:${PORT}`);
            clientSocket.on('connect', done);
        });
    });

    afterAll(async () => {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.connection.close();
        }
        server.close();
        clientSocket.close();
    });

    it('should join a room and receive JOINED event', (done) => {
        const testRoomId = 'test-room';
        const testUsername = 'test-user';

        clientSocket.emit(ACTIONS.JOIN, { roomId: testRoomId, username: testUsername });

        clientSocket.on(ACTIONS.JOINED, (data) => {
            expect(data.username).toBe(testUsername);
            expect(data.clients.length).toBeGreaterThan(0);
            done();
        });
    });

    it('should broadcast code changes to other clients', (done) => {
        const testRoomId = 'test-room';
        const testCode = 'console.log("hello")';
        
        const clientSocket2 = new Client(`http://localhost:${PORT}`);
        
        clientSocket2.on('connect', () => {
            clientSocket2.emit(ACTIONS.JOIN, { roomId: testRoomId, username: 'user2' });
            
            clientSocket2.on(ACTIONS.JOINED, () => {
                clientSocket.emit(ACTIONS.CODE_CHANGE, { roomId: testRoomId, code: testCode });
            });

            clientSocket2.on(ACTIONS.CODE_CHANGE, (data) => {
                if (data.code === testCode) {
                    expect(data.code).toBe(testCode);
                    clientSocket2.close();
                    done();
                }
            });
        });
    });
});
