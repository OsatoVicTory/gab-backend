const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const DirectMessages = require('../models/directMessages');
const Users = require('../models/users');
const { uploadMany, deleteUploadedFile } = require("../utils/upload");
// const cloudinary = require("../routes/cloudinary");
const { parallelDMClearing, parallelDeleteDMForMe } = require('../utils/delete');
const axios = require('axios');
const cheerio = require('cheerio');

exports.test = catchAsync(async (req, res) => {
    const msgs = await DirectMessages.find();
    for(let msg of msgs) {
        const { images, _id } = msg._doc; 
        if(images.length > 0) await deleteUploadedFile(images);
        await DirectMessages.findByIdAndDelete(_id);
    }
    await Users.findByIdAndUpdate(req.user.id, { contacts: [] });
    res.status(200).json({message: 'success'});
});

exports.scrappedData = catchAsync(async (req, res) => {
    const { url } = req.body;
    const resp = await axios.get(url);
    const html = resp.data;
    const $ = cheerio.load(html);

    const title = $('meta[property="og:title"]').attr('content') || url;
    const pTag = $('meta[property="og:description"]').attr('content') || url;
    const img = $('meta[property="og:image"]').attr('content');
    const site = $('meta[property="og:url"]').attr('content') || url;

    res.status(200).json({ title, pTag, img, site });
});

exports.sendMessage = catchAsync(async (req, res) => {
    const imgs = req.files||[];
    const imagesData = await uploadMany(imgs);
    let images = [];
    const msg = req.body;
    if(msg.images) images = JSON.parse(req.body.images);
    if(msg.tagged) {
        const tagged = JSON.parse(msg.tagged);
        tagged.isDelivered && delete tagged.isDelivered;
        tagged.isRead && delete tagged.isRead;
        tagged.reactions && delete tagged.reactions;
        if(tagged?.images?.length > 0) tagged.images = [tagged.images[0]];
        msg.tagged = tagged;
    }
    if(msg.scrappedData) msg.scrappedData = JSON.parse(msg.scrappedData);
    if(msg.status_tagged) msg.status_tagged = JSON.parse(msg.status_tagged);
    const newMessage = new DirectMessages({ ...msg, images: [...images, ...imagesData] });
    await newMessage.save();
    res.status(200).json({
        status: 'success',
        message: "Message sent successfully",
        messageData: newMessage?._doc||newMessage
    });
});

exports.editMessage = catchAsync(async (req, res) => {
    const { message, messageId } = req.body;
    // commented cus edited message cannot have images
    // const images = JSON.parse(req.body.images);
    // const deleted = JSON.parse(req.body.deleted);
    // const imgs = req.files||[];
    // const imagesData = await uploadMany(imgs);
    // if(deleted?.length > 0) await deleteUploadedFile(deleted);
    
    const edittedMessage = await DirectMessages.findByIdAndUpdate(
        messageId, { message, edited: String(new Date()) },
        { new: true }
    );

    res.status(200).json({
        status: 'success',
        message: "Message edited successfully",
        messageData: edittedMessage._doc,
    })
});

exports.receivedAllMessage = catchAsync(async (req, res) => {
    const date = String(new Date());
    await DirectMessages.updateMany(
        {
            receiverId: req.user.id,
            isDelivered: null
        }, 
        { isDelivered: date }
    );
    res.status(200).json({ status: 'success', message: 'Received all messages '});
});
exports.receivedMessage = catchAsync(async (req, res) => {
    const date = String(new Date());
    await DirectMessages.findByIdAndUpdate(
        req.params.id, { isDelivered: date }
    );
    res.status(200).json({ status: 'success', message: 'Received message '});
});

exports.readAllMessage = catchAsync(async (req, res) => {
    const date = String(new Date());
    await DirectMessages.updateMany(
        {
            senderId: req.params.userId,
            receiverId: req.user.id,
            isRead: null
        }, 
        { isRead: date }
    );
    res.status(200).json({ status: 'success', message: 'Read all messages '});
});
exports.readMessage = catchAsync(async (req, res) => {
    const date = String(new Date());
    const message = await DirectMessages.findById(req.params.id);
    let upd;
    if(message._doc?.isDelivered) upd = { isRead: date };
    else upd = { isRead: date, isDelivered: date };
    await DirectMessages.findByIdAndUpdate(
        req.params.id, upd
    )
    res.status(200).json({ status: 'success', message: 'Read message '});
});

exports.react = catchAsync(async (req, res) => {
    const { messageId, reaction } = req.body;
    const message = await DirectMessages.findById(messageId);
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
    await DirectMessages.findByIdAndUpdate(
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
    const filter = [ 
        { senderId: id, receiverId: user }, 
        { receiverId: id, senderId: user } 
    ];
    if(clearAll) await parallelDMClearing(filter, user);
    else await parallelDeleteDMForMe(ids, user);
    res.status(200).json({ status: 'success', message: 'Deleted successfully' });
});
exports.deleteMessageForAll = catchAsync(async (req, res) => {
    const message = await DirectMessages.findById(req.params.id);
    const { images, auxMessageId } = message._doc;
    if(images.length > 0) await deleteUploadedFile(images);
    if(auxMessageId) await DirectMessages.findByIdAndDelete(auxMessageId);
    await DirectMessages.findByIdAndDelete(req.params.id);
    return res.status(200).json({ message: 'Deleted successfully', status: 'success'});
});