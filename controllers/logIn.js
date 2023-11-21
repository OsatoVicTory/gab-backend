const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const Users = require('../models/users');
const DirectMessages = require('../models/directMessages');
const Status = require('../models/status');
const { extractUserAccount, sameTime } = require('../utils/helpers');
const { deleteUploadedFile } = require("../utils/upload");

// proposed complexity
// O( max(chat, contacts) * max(chat-messages, contacts-statuses) * contacts );

exports.logIn = catchAsync(async (req, res) => {
    const { id } = req.user;
    const user = (await Users.findById(id))._doc;
    const { blocked_users } = user;
    const profile_mp = new Map();
    const dm_mp = new Map();
    const index_mp = new Map();
    
    const fetchUserAccount = async (user_id) => {
        const profile = profile_mp.get(user_id);
        if(profile?.userName) return profile;
        const userData = extractUserAccount(await Users.findById(user_id));
        userData.userId = user_id;
        profile_mp.set(user_id, userData);
        return userData;
    };

    const con_ops = user.contacts.map(con => {
        return fetchUserAccount(con.userId).then(res => ({ ...res, ...con }));
    });
    
    const contacts = await Promise.all(con_ops);
    contacts.push({ 
        userName: 'You', userId: user._id, img: user._img,
        phoneNumber: user.phoneNumber, about: user.about, 
        userColor: user.userColor, _id: user._id,
    });
    
    let allDirectChats = await DirectMessages.find({
        deletedBy: { $ne: id },
        $or: [ { senderId: id }, { receiverId: id } ]
    });
    
    for(let chat of allDirectChats) {
        const msg = chat._doc;
        let userId = msg.senderId == id ? msg.receiverId : msg.senderId;

        const { time } = blocked_users.find(b => b.userId == userId)||{};
        if(time && (new Date(msg.createdAt)).getTime() >= (new Date(time)).getTime()) {
            continue;
        }

        let { 
            account, messages, unreadMessages, taggedYou, unReads, pinned 
        } = dm_mp.get(userId) || {};

        const tagged = () => {
            if(msg.receiverId === id) {
                if(!msg.isRead && msg?.tagged?.senderId === id) return msg._id;
                else return taggedYou||false;
            } else return taggedYou||false;
        }
        
        if(account) {
            let time_msg = sameTime(messages[messages.length - 1].createdAt, msg.createdAt);
            
            dm_mp.set(userId, {
                account, createdAt: msg.createdAt, taggedYou: tagged(), pinned,
                messages: (!time_msg ? [...messages, msg] : [...messages, {time: time_msg}, msg]),
                unreadMessages: ((msg.receiverId == id && !msg.isRead) ? unreadMessages + 1 : unreadMessages),
                unReads: ((msg.receiverId == id && !msg.isRead) ? msg._id : unReads),
                isBlocked: time ? true : false
            });
        } else {
            const accountInfo = await fetchUserAccount(userId);
            
            dm_mp.set(userId, {
                account: accountInfo, messages: [{time: sameTime(null, msg.createdAt)}, msg],
                unreadMessages: ((msg.receiverId == id && !msg.isRead) ? 1 : 0),
                unReads: ((msg.receiverId == id && !msg.isRead) ? msg._id : null),
                createdAt: msg.createdAt, taggedYou: tagged(), 
                pinned: user.pinned.includes(userId), isBlocked: time ? true : false
            });
        }
    }
    allDirectChats = [];
    let chatsTotalUnreadMessages = 0, groupsTotalUnreadMessages = 0;
    for(let data of dm_mp) {
        allDirectChats.push(data[1]);
        if(data[1].unreadMessages) chatsTotalUnreadMessages++;
    }
    allDirectChats.sort((x, y) => (
        new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime()
    ));
    allDirectChats.forEach((val, idx) => {
        index_mp.set(val.account._id, idx);
    });
    
    
    let cnt = 0;
    const FULL_DAY = 86400000;
    const cur_time = (new Date()).getTime();
    const fetchPosts = async (data) => {
        if(data.userId == id) return { statuses: [] };
        const userInfo = await fetchUserAccount(data.userId);
        userInfo.userName = data.userName;
        const statuses = await Status.find({ posterId: data.userId });
        let viewed = 0, last_time = null;
        const res_arr = [];
        for(let stats of statuses) {
            const status = stats._doc;
            const date_time = (new Date(status.createdAt)).getTime();
            if(cur_time - date_time >= FULL_DAY) {
                if(status.public_id) await deleteUploadedFile(status.public_id, 'upload');
                await Status.findByIdAndDelete(status._id.toString());
                continue;
            }
            
            const obj = {...status};
            if(status.viewers.find(({ userId }) => userId == id)) {
                viewed++;
                obj.viewed = true;
            } else obj.viewed = false;

            delete obj.viewers;
            res_arr.push(obj);
            last_time = status.createdAt;
        }
        cnt += viewed ? 1 : 0;
        const completed = viewed >= statuses.length ? 1 : 0;

        return { account: userInfo, statuses: res_arr, viewed, completed, last_time };
    }
    const posts_ops = contacts.map(contact => fetchPosts(contact).then(res => res));

    const posts = (await Promise.all(posts_ops)).filter(post => post.statuses.length > 0);
    posts.forEach(val => {
        const index = index_mp.get(val.account._id);
        if(index >= 0) allDirectChats[index].hasStatus = val.completed ? false : true;
    });

    // sort only by time as in frontend we later sort based on completed
    posts.sort((x, y) => new Date(y.last_time).getTime() - new Date(x.last_time));
    const my_status = (await Status.find({ posterId: id })).map(s => s._doc);
    const mine = [];
    for(const st of my_status) {
        if( cur_time - (new Date(st.createdAt)).getTime() >= FULL_DAY ) {
            if(st.public_id) await deleteUploadedFile(st.public_id, 'upload');
            await Status.findByIdAndDelete(st._id.toString());
        } else mine.push(st);
    }

    return res.status(200).json({
        message: `Welcome Onboard ${user.userName}`,
        status: 'success',
        User: { ...user, contacts },
        Chats: { data: [...allDirectChats], totalUnreadMessages: chatsTotalUnreadMessages }, 
        Groups: { data: [], totalUnreadMessages: 0 },
        Status: { data: posts, mine, newStatus: cnt } 
    })
});
