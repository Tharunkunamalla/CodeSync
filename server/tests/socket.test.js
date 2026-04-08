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
        const testRoomId = 'test-room-1';
        const testUsername = 'test-user-1';

        clientSocket.emit(ACTIONS.JOIN, { roomId: testRoomId, username: testUsername });

        clientSocket.once(ACTIONS.JOINED, (data) => {
            expect(data.username).toBe(testUsername);
            expect(data.clients.length).toBeGreaterThan(0);
            done();
        });
    });

    it('should broadcast code changes to other clients', (done) => {
        const testRoomId = 'test-room-2';
        const testCode = 'console.log("hello test")';
        const senderUsername = 'user1';
        
        const clientSocket1 = new Client(`http://localhost:${PORT}`);
        const clientSocket2 = new Client(`http://localhost:${PORT}`);
        
        clientSocket1.on('connect', () => {
            clientSocket1.emit(ACTIONS.JOIN, { roomId: testRoomId, username: senderUsername });
            
            clientSocket1.once(ACTIONS.JOINED, () => {
                clientSocket2.emit(ACTIONS.JOIN, { roomId: testRoomId, username: 'user2' });
                
                clientSocket2.once(ACTIONS.JOINED, () => {
                    clientSocket1.emit(ACTIONS.CODE_CHANGE, { roomId: testRoomId, code: testCode });
                });
            });
        });

        clientSocket2.on(ACTIONS.CODE_CHANGE, (data) => {
            if (data.code === testCode) {
                expect(data.username).toBe(senderUsername);
                clientSocket1.close();
                clientSocket2.close();
                done();
            }
        });
    });
});
