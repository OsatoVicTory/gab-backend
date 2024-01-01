const statusSockets = (io, socket, getUser) => {
    socket.on('sendStatus', (data) => {
        for(let id of data.ends) {
            const user = getUser(id);
            if(!user) return;
            io.to(user).emit('receiveStatus', { ...data, ends: null });
        }
    });
    
    socket.on('deleteStatus', (data) => {
        for(let id of data.ends) {
            const user = getUser(id);
            if(!user) return;
            io.to(user).emit('deleteStatus', { ...data, ends: null });
        }
    });

    socket.on('viewStatus', (data) => {
        const user = getUser(data.posterId);
        // console.log('fired viewed status');
        if(!user) return;
        console.log(user)
        io.to(user).emit('viewStatus', { ...data });
    });
}

module.exports = statusSockets;