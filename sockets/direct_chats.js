const chatsSockets = (io, socket, getUser) => {
    socket.on('sendMessage', (data) => {
        const user = getUser(data.message.receiverId);
        if(!user) return;
        console.log(`sending message to ${user}`)
        io.to(user).emit('receiveMessage', {...data})
    });

    socket.on('receivedAllMessages', (data) => {
        let user;
        for(var id of data.senders) {
            user = getUser(id);
            if(!user) return;
            io.to(user).emit('receivedMessage', {
                receiverId: data.receiverId, senderId: id 
            });
        }
    });
    socket.on('receivedMessage', (data) => {
        const user = getUser(data.senderId);
        if(!user) return;
        io.to(user).emit('receivedMessage', { ...data });
    })

    socket.on('readMessage', (data) => {
        const user = getUser(data.senderId);
        if(!user) return;
        console.log('read message');
        io.to(user).emit('readMessage', { ...data });
    });

    socket.on('typing', (data) => {
        const user = getUser(data.receiver);
        if(!user) return;
        console.log(`typing=> ${data.receiver}`);
        io.to(user).emit('typing', { ...data });
    })
    socket.on('stoppedtyping', (data) => {
        const user = getUser(data.receiver);
        if(!user) return;
        console.log('stoppedtyping');
        io.to(user).emit('stoppedtyping', { ...data });
    })

    socket.on('edittedMessage', (data) => {
        const user = getUser(data.receiverId);
        if(!user) return;
        io.to(user).emit('edittedMessage', data);
    });

    socket.on('deletedMessage', (data) => {
        const user = getUser(data.receiverId);
        if(!user) return;
        io.to(user).emit('deletedMessage', data);
    })

    socket.on('reacted', (data) => {
        const user = getUser(data.receiverId);
        if(!user) return;
        io.to(user).emit('reacted', { ...data });
    });
    socket.on('removeReaction', (data) => {
        const user = getUser(data.receiverId);
        if(!user) return;
        io.to(user).emit('removeReaction', { ...data });
    });

}

module.exports = chatsSockets;