const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const { extractUserAccount, sameTime } = require("../utils/helpers");
// const cloudinary = require("../routes/cloudinary");
const Groupchats = require("../models/groupChats");
const GroupMessages = require("../models/groupMessages");
const Users = require('../models/users');
const { deleteUploadedFile, uploadSingle } = require("../utils/upload");

exports.fix = catchAsync(async (req, res) => {
    const groups = await Groupchats.find();
    for(let g of groups) {
        const { participants, _id, cloudinary_id } = g._doc;
        if(cloudinary_id) await deleteUploadedFile(cloudinary_id);
        for(let p of participants) {
            await Users.findByIdAndUpdate(p.userId, {$pull: { groups: _id }});
        }
        await GroupMessages.deleteMany({ groupId: _id });
        await Groupchats.findByIdAndDelete(_id);
    }
    res.status(200).json({message: 'Success'});
})
exports.fetchGroup = catchAsync(async (req, res) => {
    const group = await Groupchats.findById(req.params.id);
    res.status(200).json({ message: 'Group fetched !', status: 'success', group: group._doc });
});

exports.createGroup = catchAsync(async (req, res) => {
    const image = req.file;
    let img = '', cloudinary_id ='';
    if(image?.path) {
        const res = await uploadSingle(image);
        img = res.img;
        cloudinary_id = res.cloudinary_id;
    }
    const participants = JSON.parse(req.body.participants);
    const group = new Groupchats({ ...req.body, img, cloudinary_id, participants });
    await group.save();
    
    const participantsInfo = async (par) => {
        const user = await Users.findByIdAndUpdate(
            par.userId, {$push: { 'groups': group._doc._id.toString() }}, { new: true }
        );
        return { ...extractUserAccount(user), ...par };
    }
    const ops = participants.map(par => participantsInfo(par).then(res => res));
    const participantsData = await Promise.all(ops);
    const groupMessage = new GroupMessages({
        centerMessage: `${req.user.id} created this group`,
        groupId: group._doc._id.toString(), senderId: req.user.id
    });
    await groupMessage.save();
    return res.status(200).json({
        message: 'Group created successfully',
        group: { ...group._doc, participants: participantsData, aux_arr: [] },
        groupMessage: groupMessage._doc
    })
});

exports.editGroup = catchAsync(async (req, res) => {
    const image = req.file;
    const groupId = req.params.id;
    const { id } = req.user;
    let { acct_img, cloudinary_id } = req.body;
    const { participants } = (await Groupchats.findById(groupId))._doc;
    if(image?.path) {
        if(cloudinary_id) await deleteUploadedFile(cloudinary_id);
        const resp = await uploadSingle(image);
        acct_img = resp.img;
        cloudinary_id = resp.cloudinary_id;
    }
    let messages = [];
    const updateGroup = async (par) => {
        if(!participants.find(p => p.userId === par.userId)) {
            const user = await Users.findByIdAndUpdate(par.userId,
                {$push: { 'groups': groupId }}, { new: true }
            );
            const message = new GroupMessages({
                centerMessage: `${id} added ${par.userId}`,
                groupId: groupId, senderId: id,
            })
            await message.save();
            messages.push(message._doc);
            return { ...extractUserAccount(user), ...par };
        } else {
            const user = await Users.findById(par.userId);
            return { ...extractUserAccount(user), ...par };
        }
    }
    const pullOps = async (userId) => {
        if(bodyParticipants.find(par => par.userId == userId)) {
            return { userId: 'OK' };
        } else {
            const user = await Users.findByIdAndUpdate(userId, 
                {$pull: { groups: groupId }}, { new: true } 
            );
            return { ...extractUserAccount(user), userId };
        }
    }
    const bodyParticipants = JSON.parse(req.body.participants);
    const ops = bodyParticipants.map(par => updateGroup(par).then(res => res));
    const pull_ops = participants.map(par => pullOps(par.userId).then(res => res));
   const participantsData = await Promise.all(ops);
   const aux_arr = await Promise.all(pull_ops);
    const newGroup = await Groupchats.findByIdAndUpdate(
        groupId, { ...req.body, participants: bodyParticipants, img: acct_img, cloudinary_id }, 
        { new: true }
    );
    res.status(200).json({
        message: `Group edited successfully`, messages,
        group: { ...newGroup._doc, participants: participantsData, aux_arr }, 
    });
});

exports.joinGroup = catchAsync(async (req, res) => {
    const { id } = req.user;
    const groupId = req.params.id;
    const group = await Groupchats.findById(groupId);
    let { participants } = group._doc;
    if(participants.find(par => par.userId === id)) {
        return appError(res, 500, 'Already in group');
    }
    participants.push({ userId: id, admin: false });
    const newGroup = await Groupchats.findByIdAndUpdate(
        groupId, { participants }, { new: true }
    );
    await Users.findByIdAndUpdate(id,
        {$push: { 'groups': groupId }}
    );
    const message = new GroupMessages({
        centerMessage: `${id} joined this group via group link`,
        senderId: id, groupId: groupId
    })
    await message.save();
    let gc_mp = new Map(), id_mp = new Map();
    const participantsInfo = async (par) => {
        const user = await Users.findById(par.userId);
        gc_mp.set(par.userId, 1);
        return { ...extractUserAccount(user), ...par };
    }
    const ops = participants.map(par => participantsInfo(par).then(res => res));
    const participantsData = await Promise.all(ops);

    const data = await GroupMessages.find({ groupId });
    let messages = [], time = null;
    for(let { _doc } of data) {
        const { senderId, tagged } = _doc;
        if(!gc_mp.has(senderId) && !id_mp.has(senderId)) id_mp.set(senderId, 1);
        if(tagged?.senderId && !gc_mp.has(tagged.senderId) && !id_mp.has(tagged.senderId)) {
            id_mp.set(tagged.senderId, 1);
        }
        let time_msg = sameTime(time, _doc.createdAt);
        if(time_msg) messages.push({time: time_msg});

        if(id != _doc.senderId) messages.push({ ..._doc, receivers: null });
        else messages.push(_doc);

        time = _doc.createdAt;
    }
    const len = messages.length;
    let arr = [];
    for(let id_ of id_mp) arr.push(id_[0]);
    const aux_ops = arr.map(val => participantsInfo({ userId: val }).then(res => res));
    const aux_arr = await Promise.all(aux_ops);

    res.status(200).json({
        message: 'Joined group successfully', status: 'success',
        group: { account: { ...newGroup._doc, participants: participantsData, aux_arr },
            unReads: len, messages, unreadMessages: len 
        }, join_message: message._doc,
    });
});

exports.makeAdmin = catchAsync(async (req, res) => {
    const { id, userId } = req.params;
    const group = await Groupchats.findById(id);
    let { participants } = group._doc;
    let admin = false;
    for(let p = 0; p < participants.length; p++) {
        if(participants[p].userId == userId) {
            if(participants[p].admin) {
                participants[p].admin = false;
                admin = true;
            } else {
                participants[p].admin = true;
            }
            break;
        }
    }
    await Groupchats.findByIdAndUpdate(id, { participants });
    if(admin) {
        const newMessage = new GroupMessages({
            centerMessage: `${req.user.id} removed ${userId} as admin`,
            senderId: req.user.id, groupId: id,
        });
        await newMessage.save();
        return res.status(200).json({
            status: 'success',
            message: 'User has been removed from admin',
            messageData: newMessage._doc,
        });
    } else {
        const newMessage = new GroupMessages({
            centerMessage: `${req.user.id} made ${userId} admin`,
            senderId: req.user.id, groupId: id,
        });
        await newMessage.save();
        return res.status(200).json({
            status: 'success',
            message: 'User has been made admin',
            messageData: newMessage._doc,
        });
    }
});

exports.removeParticipant = catchAsync(async (req, res) => {
    const { id, userId } = req.params;
    const group = await Groupchats.findById(id);
    const { participants } = group._doc;
    const newParticipants = participants.filter(par => par.userId != userId);
    await Groupchats.findByIdAndUpdate(id, { participants: newParticipants });
    await Users.findByIdAndUpdate(userId, {$pull: { groups: id }} );
    const newMessage = new GroupMessages({
        centerMessage: `${req.user.id} removed ${userId}`,
        senderId: req.user.id, groupId: id,
    });
    await newMessage.save();
    return res.status(200).json({
        status: 'success',
        message: 'User has been removed',
        messageData: newMessage._doc,
    });
});

exports.exitGroup = catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const { participants } = (await Groupchats.findById(id))._doc;
    const newParticipants = participants.filter(par => par.userId != userId);
    await Users.findByIdAndUpdate(userId, {$pull: { groups: id }} );
    const newMessage = new GroupMessages({
        centerMessage: `${userId} exited group`,
        senderId: userId, groupId: id,
    });
    await newMessage.save();
    await Groupchats.findByIdAndUpdate(id, { participants: newParticipants }); 
    return res.status(200).json({
        status: 'success',
        message: 'Exited group successfully',
        messageData: newMessage._doc,
    });
});