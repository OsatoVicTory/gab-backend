const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const app = express();
const Users = require('./models/users');
const server = require('http').createServer(app);
const socket = require("socket.io");
const connectMongo = require('./startup/mongoose');

require("dotenv").config();
const port = process.env.PORT;

app.use(express.json());
app.use(cors({ origin: true, methods: "GET,HEAD,POST,PUT,PATCH,DELETE", credentials: true }));
app.use(cookieParser());

const Routes = require("./routes/index");
const chatsSockets = require('./sockets/direct_chats');
// const groupsSockets = require("./sockets/group_chats");
const statusSockets = require("./sockets/status");
// const callsSockets = require("./sockets/calls");

connectMongo();

app.use("/", Routes);

const io = socket(server, {
    cors: {
        origin: '*',//process.env.FRONTEND_URL,
        methods: ["GET", "POST"]
    }
});

//server listening is below

let onlineUsers = new Map();

const getUser = (userId) => onlineUsers.get(userId);
const removeUser = async (socket) => {
    for(let [userId, socketId] of onlineUsers) {
        if(socketId == socket) {
            const id = userId;
            const date = String(new Date());
            onlineUsers.delete(userId);
            await Users.findByIdAndUpdate(id, { lastSeen: date });
            return { userId: id, date };
        }
    }
    return {};
}
const addUser = (userId, socketId) => onlineUsers.set(userId, socketId);

io.on('connection', (socket) => {
    console.log('socket connected')
    
    socket.on('userOnline', async (id) => {
        console.log(`addedUser => ${id}`);
        addUser(id, socket.id);
        io.emit('updateAccount', {_id: id, lastSeen: 'online'});
        await Users.findByIdAndUpdate(id, { lastSeen: 'online' });
    });

    chatsSockets(io, socket, getUser);
    // groupsSockets(io, socket, getUser);
    statusSockets(io, socket, getUser);
    // callsSockets(io, socket, getUser);

    socket.on('updateAccount', (data) => {
        io.emit('updateAccount', { ...data });
    })

    socket.on('disconnect', async () => {
        console.log('socket disconnected');
        const { userId, date } = await removeUser(socket.id);
        if(userId) {
            io.emit('updateAccount', {
                _id: userId,
                lastSeen: date,
            });
        }
    });
});


server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});