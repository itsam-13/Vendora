const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const agent = require('../agent/agent');


async function initSocketServer(httpServer) {
    const io = new Server(httpServer, {});
    const jwtSecret = process.env.JWT_SECRET || process.env.JWT_SECRET_KEY;

    io.use((socket, next) => {
        const cookies = socket.handshake.headers?.cookie;
        const { token } = cookies ? cookie.parse(cookies) : {};

        if (!token) {
            return next(new Error('Token not provided'));
        }

        if (!jwtSecret) {
            return next(new Error('JWT secret is not configured'));
        }

        try {
            const decoded = jwt.verify(token, jwtSecret);
            socket.user = decoded;
            socket.token = token;
            next();
        } catch (err) {
            return next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {

        console.log(socket.user, socket.token);

        socket.on('message', async (data) => {
            const agentResponse = await agent.invoke({
                messages: [
                    {
                        role: 'user',
                        content: data
                    }
                ]
            }, {
                metadata: {
                    token: socket.token
                }
            });

            const lastMessage = agentResponse.messages[agentResponse.messages.length - 1];

            socket.emit('message', lastMessage.content);
        })

    });
}

module.exports = initSocketServer;