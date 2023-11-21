const DirectMessages = require('../models/directMessages');
const GroupMessages = require('../models/groupMessages');
const { deleteUploadedFile } = require("./upload");

const deleteDMOps = async (_id, user) => {
    const msg = await DirectMessages.findById(_id);
    if(!msg?._doc) return 'OK';
    const { deletedBy, images } = msg._doc; 
    if(deletedBy && deletedBy != user) {
        if(images.length > 0) await deleteUploadedFile(images);
        await DirectMessages.findByIdAndDelete(_id);
    } else {
        await DirectMessages.findByIdAndUpdate(_id, { deletedBy: user });
    }
    return 'OK';
};

const deleteGCOps = async (_id, user) => {
    const msg = await GroupMessages.findById(_id);
    if(!msg?._doc) return 'OK';
    await GroupMessages.findByIdAndUpdate(
        _id, {$push: { "deletedBy": user }}
    );
    return 'OK';
}

const clearDMOps = async (msg, user) => {
    if(!msg?._doc) return 'OK';
    const { images, _id, deletedBy } = msg._doc;
    if(deletedBy && deletedBy != user) {
        if(images.length > 0) await deleteUploadedFile(images);
        await DirectMessages.findByIdAndDelete(_id);
    } else {
        await DirectMessages.findByIdAndUpdate(_id, { deletedBy: user });
    }
    return 'OK';
};

const clearGCOps = async (msg, user) => {
    if(!msg?._doc) return 'OK';
    const { _id, deletedBy } = msg._doc;
    if(!deletedBy.includes(user)) {
        await GroupMessages.findByIdAndUpdate(
            _id, {$push: { "deletedBy": user }}
        );
    }
    return 'OK';
}

exports.parallelDeleteDMForMe = async (delete_ids, user) => {
    const delete_ops = delete_ids.map(_id => deleteDMOps(_id, user).then(res => res));
    await Promise.all(delete_ops);
};

exports.parallelDeleteGCForMe = async (delete_ids, user) => {
    const delete_ops = delete_ids.map(_id => deleteGCOps(_id, user).then(res => res));
    await Promise.all(delete_ops);
}

exports.parallelDMClearing = async (filter, user) => {
    const msgs = await DirectMessages.find({ $or: filter });
    const clearing_ops = msgs.map(msg => clearDMOps(msg, user).then(res => res));
    await Promise.all(clearing_ops);
};

exports.parallelGCClearing = async (id, user) => {
    const msgs = await GroupMessages.find({ groupId: id });
    const clearing_ops = msgs.map(msg => clearGCOps(msg, user).then(res => res));
    await Promise.all(clearing_ops);
};