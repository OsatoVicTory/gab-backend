const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const Users = require('../models/users');
const DirectMessages = require('../models/directMessages');
const GroupMessages = require('../models/groupMessages');
const { extractUserAccount, sameTime } = require('../utils/helpers');
const Groupchats = require("../models/groupChats");

exports.loggedIn = catchAsync(async (req, res) => {
    const { id } = req.user;
    const user = (await Users.findById(id))._doc;
    const { blocked_users } = user;
    let dm_mp = new Map();
    let profile_mp = new Map();
    
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
    let contacts = await Promise.all(con_ops);
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

        const { time } = blocked_users.find(b => b.userId === msg.senderId)||{};
        if(time && (new Date(msg.createdAt)).getTime() >= (new Date(time)).getTime()) {
            continue;
        }

        let { account, messages, unreadMessages, taggedYou, unReads } = dm_mp.get(userId)||{};

        const tagged = () => {
            if(msg.receiverId === id) {
                if(!msg.isRead && msg?.tagged?.senderId === id) return msg._id;
                else return taggedYou||false;
            } else return taggedYou||false;
        }
        
        if(account) {
            let time_msg = sameTime(messages[messages.length - 1].createdAt, msg.createdAt);
            
            dm_mp.set(userId, {
                account, createdAt: msg.createdAt, taggedYou: tagged(),
                messages: (!time_msg ? [...messages, msg] : [...messages, {time: time_msg}, msg]),
                unreadMessages: ((msg.receiverId == id && !msg.isRead) ? unreadMessages + 1 : unreadMessages),
                unReads: ((msg.receiverId == id && !msg.isRead) ? msg._id : unReads),
            });
        } else {
            const accountInfo = await fetchUserAccount(userId);
            
            dm_mp.set(userId, {
                account: accountInfo, messages: [{time: sameTime(null, msg.createdAt)}, msg],
                unreadMessages: ((msg.receiverId == id && !msg.isRead) ? 1 : 0),
                unReads: ((msg.receiverId == id && !msg.isRead) ? msg._id : null),
                createdAt: msg.createdAt, taggedYou: tagged()
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
    
    const fetchGroupMessages = async (groupId) => {
        const data = await GroupMessages.find({ groupId, deletedBy: { $nin: [ id ] } });
        let groupData = (await Groupchats.findById(groupId))._doc;
        const { participants } = groupData;
        let gc_mp = new Map(), id_mp = new Map();
        const par_ops = participants.map(par => {
            return fetchUserAccount(par.userId).then(res => {
                gc_mp.set(par.userId, 1);
                return { ...res, ...par };
            });
        });
        groupData.participants = await Promise.all(par_ops);

        let unreadMessages = 0, len = null, taggedYou = false, unReads = 0;
        let dataRef = [], time = null;
        for(var i = 0; i < data.length; i++) {
            const { createdAt, receivers, senderId, _id, tagged, message, centerMessage } = data[i]._doc;
            len = createdAt;
            if(!gc_mp.has(senderId) && !id_mp.has(senderId)) id_mp.set(senderId, 1);
            if(tagged?.senderId && !gc_mp.has(tagged.senderId) && !id_mp.has(tagged.senderId)) {
                id_mp.set(tagged.senderId, 1);
            }

            let time_msg = sameTime(time, createdAt);
            if(time_msg) dataRef.push({time: time_msg});
            
            if(centerMessage) dataRef.push({...data[i]._doc, receivers: null }); 
            else if(senderId !== id) {
                const received = receivers.find(p => p.userId == id);
                if(!received || !received?.read) {
                    unreadMessages++;
                    unReads++;
                    taggedYou = (tagged?.senderId==id ? _id : false)||taggedYou;
                    taggedYou = ((message?.length <= 1000 &&
                        message?.includes(id)) ? _id : false)||taggedYou;
                } 
                dataRef.push({...data[i]._doc, receivers: null });

            } else dataRef.push(data[i]._doc);
    
            time = createdAt;
        }
        if(unreadMessages) groupsTotalUnreadMessages++;
        let arr = [];
        for(let id_ of id_mp) arr.push(id_[0]);
        const aux_ops = arr.map(val => fetchUserAccount(val).then(res => res));
        const aux_arr = await Promise.all(aux_ops);
        return { 
            account: { ...groupData, aux_arr }, messages: dataRef, taggedYou,
            unreadMessages, unReads, createdAt: len||'9 Jul 2000',
        };
    }
    const groups_ops = user.groups.map(groupId => fetchGroupMessages(groupId).then(res => res));
    const Groups = await Promise.all(groups_ops);
    Groups.sort((x, y) => new Date(y.createdAt).getTime() - new Date(x.createdAt).getTime());

    return res.status(200).json({
        message: `Welcome Onboard ${user.userName}`,
        status: 'success',
        User: { ...user, contacts },
        Chats: { data: [...allDirectChats], totalUnreadMessages: chatsTotalUnreadMessages }, 
        Groups: { data: [...Groups], totalUnreadMessages: groupsTotalUnreadMessages },
    })
});
