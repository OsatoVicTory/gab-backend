const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const GroupMessages = require('../models/groupMessages');
const Groupchats = require("../models/groupChats");
const Users = require('../models/users');
const { parallelGCClearing, parallelDeleteGCForMe } = require('../utils/delete');
const { uploadMany, deleteUploadedFile } = require('../utils/upload');
const { sameTime, extractUserAccount } = require('../utils/helpers');

exports.test = catchAsync(async (req, res) => {
    const msgs = await GroupMessages.find();
    let groups = []
    for(let msg of msgs) {
        const { images, _id, groupId } = msg._doc; 
        if(!groups.includes(groupId)) groups.push(groupId);
        if(images.length > 0) await deleteUploadedFile(images);
        await GroupMessages.findByIdAndDelete(_id);
    }
    for(var g of groups) {
        const { participants } = (await GroupChats.findById(g))._doc;
        for(let p of participants) {
            await Users.findByIdAndUpdate(p.userId, {$pull: { groups: g }});
        }
    }
    res.status(200).json({message: 'success'});
});

exports.fetchWithMessages = catchAsync(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;
    const group = await Groupchats.findById(id);
    let gc_mp = new Map(), id_mp = new Map();
    const fetchUser = async (par) => {
        return { ...extractUserAccount(await Users.findById(par.userId)), ...par };
    }
    const ops = group._doc.participants.map(par => fetchUser(par).then(res => {
        gc_mp.set(par.userId, 1);
        return res;
    }));
    const participants = await Promise.all(ops);

    const data = await GroupMessages.find({ groupId: id, deletedBy: { $nin: [ userId ] } });
    let dataRef = [], taggedYou = null, unreadMessages = 0, unReads = 0, time = null;

    for(var i = 0; i < data.length; i++) {
        const { createdAt, senderId, receivers, _id, tagged, message, ceneterMessage } = data[i]._doc;
        if(!gc_mp.has(senderId) && !id_mp.has(senderId)) id_mp.set(senderId, 1);
        if(tagged?.senderId && !gc_mp.has(tagged.senderId) && !id_mp.has(tagged.senderId)) {
            id_mp.set(tagged.senderId, 1);
        }
        let time_msg = sameTime(time, createdAt);
        if(time_msg) dataRef.push({time: time_msg});
        
        if(ceneterMessage) dataRef.push(data[i]._doc);
        else if(senderId !== userId) {
            const received = receivers.find(p => p.userId == userId);
            if(!received || !received?.read) {
                unreadMessages++;
                unReads++;
                taggedYou = (tagged?.senderId==userId ? _id : false)||taggedYou;
                taggedYou = ((message?.length <= 1000 &&
                    message?.includes(userId)) ? _id : false)||taggedYou;
            } 
            dataRef.push({...data[i]._doc, receivers: null });
        } else dataRef.push(data[i]._doc);

        time = createdAt;
    }
    let arr = [];
    for(let id_ of id_mp) arr.push(id_[0]);
    const aux_ops = arr.map(val => fetchUser({ userId: val }).then(res => res));
    const aux_arr = await Promise.all(aux_ops);

    res.status(200).json({ 
        status: 'success', message: 'Group fetched !',
        group: { account: { ...group._doc, participants, aux_arr }, 
        messages: dataRef, unReads, taggedYou, unreadMessages } 
    });
});

exports.sendMessage = catchAsync(async (req, res) => {
    const imgs = req.files||[];
    const imagesData = await uploadMany(imgs);
    let images = [];
    const msg = req.body;
    if(msg.images) images = JSON.parse(msg.images);
    if(msg.tagged) {
        const tagged = JSON.parse(msg.tagged);
        tagged.deletedBy && delete tagged.deletedBy;
        tagged.receivers && delete tagged.receivers;
        tagged.reactions && delete tagged.reactions;
        if(tagged?.images?.length > 0) tagged.images = [tagged.images[0]];
        msg.tagged = tagged;
    }
    const newMessage = new GroupMessages({
        ...msg, senderId: req.user.id, images: [...images, ...imagesData]
    });
    await newMessage.save();
    res.status(200).json({
        status: 'success',
        message: "Message sent successfully",
        messageData: newMessage?._doc||newMessage
    })
});

exports.editMessage = catchAsync(async (req, res) => {
    const { message, senderId, groupId, messageId } = req.body;
    const images = JSON.parse(req.body.images);
    const deleted = JSON.parse(req.body.deleted);
    const imgs = req.files||[];
    const imagesData = await uploadMany(imgs);
    if(deleted?.length > 0) await deleteUploadedFile(deleted);
    // remove any auxMessage attached to this message to add new updated one
    await GroupMessages.deleteOne({ messageId });
    const auxMessage = new GroupMessages({
        senderId, groupId, messageId,
        centerMessage: `${req.user.id} edited a message. Click to view`
    });
    const auxData = await auxMessage.save();
    const edittedMessage = await GroupMessages.findByIdAndUpdate(
        messageId,
        { 
            images: [...images, ...imagesData], 
            auxMessageId: auxData._doc._id.toString(),
            message, edited: String(new Date())
        },
        { new: true }
    );
    
    res.status(200).json({
        status: 'success',
        message: "Message edited successfully",
        messageData: [
            edittedMessage._doc,
            auxData._doc
        ], 
    })
});

exports.receivedAllMessage = catchAsync(async (req, res) => {
    const date = String(new Date());
    const { id } = req.user;
    const { groups } = (await Users.findById(id))._doc;
    const updateGroup = async (_id) => {
        await GroupMessages.updateMany(
            {
                senderId: { $ne: id },
                groupId: _id,
                'receivers.userId': { $ne: id }
            }, 
            {$push: {"receivers": {
                userId: id, delivered: date, read: null,
            }}}
        );
        return 'Ok';
    };
    const ops = groups.map(groupId => updateGroup(groupId).then(res => res));
    await Promise.all(ops);
    res.status(200).json({ status: 'success', message: 'Received all messages '});
});
exports.receivedMessage = catchAsync(async (req, res) => {
    const date = String(new Date());
    await GroupMessages.findByIdAndUpdate(
        req.params.id,  
        {$push: {"receivers": {
            userId: req.user.id, delivered: date, read: null,
        }}}
    );
    res.status(200).json({ status: 'success', message: 'Received message '});
});

exports.readAllMessage = catchAsync(async (req, res) => {
    const date = String(new Date());
    const userId = req.user.id;
    const msgs = await GroupMessages.find({
        groupId: req.params.groupId,
        senderId: { $ne: userId },
    });
    let breakLoop = false;
    for(let m = msgs.length - 1; m >= 0; m--) {
        let { _id, receivers } = msgs[m]._doc;
        let newReceivers = [], found = false;
        for(let receiver of receivers) {
            if(receiver.userId === userId) {
                found = true;
                if(!receiver.read) newReceivers.push({ ...receiver, read: date });
                else { breakLoop = true; break; }
            } else {
                newReceivers.push(receiver);
            } 
        }
        if(!breakLoop) {
            if(!found) newReceivers.push({ userId, delivered: date, read: date });
            await GroupMessages.findByIdAndUpdate(_id, { receivers: newReceivers });
        }
        else break;
    }
    res.status(200).json({ status: 'success', message: 'Read all messages '});
});
exports.readMessage = catchAsync(async (req, res) => {
    const date = String(new Date());
    const userId = req.user.id;
    let { _id, receivers } = (await GroupMessages.findById(req.params.id))._doc;
    let newReceivers = [], found = false;
    for(let receiver of receivers) {
        if(receiver.userId === userId) {
            if(!receiver.read) newReceivers.push({ ...receiver, read: date });
            found = true;
        } else {
            newReceivers.push(receiver);
        } 
    }
    if(!found) newReceivers.push({ userId, delivered: date, read: date });
    await GroupMessages.findByIdAndUpdate(_id, { receivers: newReceivers });
    res.status(200).json({ status: 'success', message: 'Read message '});
});


exports.react = catchAsync(async (req, res) => {
    const { messageId, reaction } = req.body;
    const message = await GroupMessages.findById(messageId);
    let newReactions = [], index = null;
    for(let reactor of message._doc.reactions) {
        if(reactor.userId === reaction.userId) {
            if(reaction.emoji) newReactions.push(reaction);
            index = 'found';
        } else {
            newReactions.push(reactor);
        }
    }
    if(!index) newReactions.push(reaction);
    await GroupMessages.findByIdAndUpdate(
        messageId,
        { reactions: newReactions }
    );
    return res.status(200).json({
        status: 'success',
        message: reaction.emoji ? 'Reaction sent' : 'Reaction removed',
        reactions: newReactions,
    })
});

exports.deleteMessageForMe = catchAsync(async (req, res) => {
    const { ids, clearAll } = req.body;
    const user = req.user.id;
    const { id } = req.params;
    if(clearAll) await parallelGCClearing(id, user);
    else await parallelDeleteGCForMe(ids, user);
    return res.status(200).json({ message: 'Deleted successfully '});
});
exports.deleteMessageForAll = catchAsync(async (req, res) => {
    const message = await GroupMessages.findById(req.params.id);
    const { images, auxMessageId } = message._doc;
    if(images.length > 0) await deleteUploadedFile(images);
    if(auxMessageId) await GroupMessages.findByIdAndDelete(auxMessageId);
    await GroupMessages.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Deleted successfully '});
});