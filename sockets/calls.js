const callsSockets = (io, socket, getUser) => {
    socket.on('callingUser', (data) => {
        const user = getUser(data.receiverId);
        if(!user) return;
        io.to(user).emit('receivingCall', {...data})
    });
    socket.on('userInCall', (data) => {
        const user = getUser(data.to);
        if(!user) return;
        io.to(user).emit('userInCall', {...data});
    });
    socket.on('callAccepted', (data) => {
        const user = getUser(data.callerId);
        if(!user) return;
        io.to(user).emit('callAccepted', {...data})
    });
    socket.on('stream-data', (data) => {
        const user = getUser(data.to);
        if(!user) return;
        io.to(user).emit('stream-data', {...data});
    });
    socket.on('endCall', (data) => {
        const user = getUser(data.to);
        if(!user) return;
        io.to(user).emit('endedCall', {...data})
    });
}

module.exports = callsSockets;