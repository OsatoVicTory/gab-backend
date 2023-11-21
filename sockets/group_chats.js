const groupsSockets = (io, socket, getUser) => {
    socket.on('sendMessageGroup', (data) => {
        io.emit('receiveMessageGroup', {...data})
    });
    socket.on('receivedAllMessageGroup', (data) => {
        for(var group of data.groups) {
            io.emit('receivedMessageGroup', { 
                time: data.time, groupId: group,
                receiverId: data.receiverId, 
            });
        }
    });
    socket.on('receivedMessageGroup', (data) => {
        io.emit('receivedMessageGroup', { ...data });
    });
    socket.on('readMessageGroup', (data) => {
        io.emit('readMessageGroup', { ...data });
    });

    socket.on('typingGroup', (data) => {
        io.emit('typingGroup', { ...data });
    })
    socket.on('stoppedtypingGroup', (data) => {
        io.emit('stoppedtypingGroup', { ...data });
    });

    socket.on('edittedMessageGroup', (data) => {
        io.emit('edittedMessageGroup', { ...data });
    });
    socket.on('deletedMessageGroup', (data) => {
        io.emit('deletedMessageGroup', { ...data });
    });

    socket.on('createGroup', (data) => {
        let user;
        for(var id of data.ends) {
            user = getUser(id);
            if(!user) return;
            io.to(user).emit('createGroup', { ...data, ends: null });
        }
    });
    socket.on('editedGroup', (data) => {
        let user = getUser(data.receiverId);
        if(!user) return;
        io.to(user).emit('editedGroup', { ...data });
    });
    socket.on('joinedGroup', (data) => {
        io.emit('joinedGroup', { ...data });
    });
    socket.on('makeAdmin', (data) => {
        io.emit('makeAdmin', { ...data });
    });
    socket.on('removeParticipant', (data) => {
        io.emit('removeParticipant', { ...data });
    });
    socket.on('exitedGroup', (data) => {
        io.emit('exitedGroup', { ...data });
    });

    socket.on('reactedGroup', (data) => {
        io.emit('reactedGroup', { ... data });
    })

}

module.exports = groupsSockets;