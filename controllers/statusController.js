const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const Status = require('../models/status');
const Users = require('../models/users');
const { deleteUploadedFile, uploadStatusFile, writeStatus } = require("../utils/upload");
const { extractUserAccount } = require("../utils/helpers");
const FULL_DAY = 86400000;

exports.fix = catchAsync(async (req, res) => {
    const statuses = await Status.find();
    for(let s of statuses) {
        const { public_id, _id, bg } = s._doc;
        await deleteUploadedFile(public_id, bg ? 'text' : 'upload');
        await Status.findByIdAndDelete(_id);
    }
    res.status(200).json({ message: 'Fixed successfully' });
});

exports.fetchAllStatus = catchAsync(async (req, res) => {
    const { contacts } = (await Users.findById(req.user.id))._doc;
    let cnt = 0;
    const cur_time = (new Date()).getTime();
    const fetchPosts = async (data) => {
        const user = extractUserAccount(await Users.findById(data.userId));
        user.userName = data.userName;
        const statuses = await Status.find({ posterId: data.userId });
        let viewed = 0, res = [], last_time = null;
        for(let stats of statuses) {
            const status = stats._doc;
            const date_time = (new Date(status.createdAt)).getTime();
            if(cur_time - date_time >= FULL_DAY) {
                await deleteUploadedFile(status.public_id, status.bg ? 'text' : 'upload');
                await Status.findByIdAndDelete(status._id.toString());
                continue;
            }
            
            const obj = {...status};
            if(status.viewers.find(({ userId }) => userId == req.user.id)) {
                viewed++;
                obj.viewed = true;
            } else obj.viewed = false;

            delete obj.viewers;
            res.push(obj);
            last_time = status.createdAt;
        }
        cnt += viewed ? 1 : 0;
        const completed = viewed >= statuses.length ? 1 : 0;
        return { account: user, statuses: res, viewed, completed, last_time };
    }
    const posts_ops = contacts.map(contact => fetchPosts(contact).then(res => res));
    const posts = (await Promise.all(posts_ops)).filter(post => post.statuses.length > 0);
    // sort only by time as in frontend we later sort based on completed
    posts.sort((x, y) => new Date(y.last_time).getTime() - new Date(x.last_time));
    const mine = (await Status.find({ posterId: req.user.id })).map(s => s._doc);
    res.status(200).json({ 
        status: 'success', message: 'Posts fetched !', 
        status: { data: posts, mine, newStatus: cnt } 
    });
});

exports.uploadStatus = catchAsync(async (req, res) => {
    const { caption } = req.body;
    const { img, hash, public_id } = await uploadStatusFile(req.file);
    const { id } = req.user;
    const status = new Status({ caption, img, public_id, hash, posterId: id });
    await status.save();
    const { contacts } = (await Users.findById(id))._doc;
    const Ops = async (userId, barred) => {
        if(barred) return '';
        const user_contacts = (await Users.findById(userId))._doc.contacts;
        if(user_contacts.find(c => c.userId === id)) return userId;
        else return '';
    }
    const ends_ops = contacts.map(con => Ops(con.userId, con.barred).then(res => res));
    const ends = (await Promise.all(ends_ops)).filter(c => c);
    res.status(200).json({ 
        status: 'success', message: 'Posted successfully', status: status._doc, ends
    });
});

exports.createStatus = catchAsync(async (req, res) => {
    // const { img, hash, public_id, bg } = await writeStatus(req.body);
    const { text, font } = req.body;
    const { id } = req.user;
    const status = new Status({ text, font, posterId: id });
    await status.save();
    const { contacts } = (await Users.findById(id))._doc;
    const Ops = async (userId, barred) => {
        if(barred) return '';
        const user_contacts = (await Users.findById(userId))._doc.contacts;
        if(user_contacts.find(c => c.userId === id)) return userId;
        else return '';
    }
    const ends_ops = contacts.map(con => Ops(con.userId, con.barred).then(res => res));
    const ends = (await Promise.all(ends_ops)).filter(c => c);
    res.status(200).json({ 
        status: 'success', message: 'Posted successfully', status: status._doc, ends
    });
});

exports.deleteStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const status = await Status.findById(id);
    const type = status._doc.bg ? 'text' : 'upload';
    await deleteUploadedFile(status._doc.public_id, type);
    await Status.findByIdAndDelete(id);
    res.status(200).json({ status: 'success', message: 'Deleted successfully' });
});

exports.viewStatus = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = req.user.id;
    let { viewers } = (await Status.findById(id))._doc;
    let i = 0;
    for(; i < viewers.length; i++) {
        if(viewers[i].userId == user) break;
    }
    if(i == viewers.length) viewers.push({ userId: user, time: String(new Date()) });
    await Status.findByIdAndUpdate(id, { viewers });
    res.status(200).json({ status: 'success', message: 'Viewed' });
});

exports.refresh = catchAsync(async (req, res) => {
    const cur_time = (new Date()).getTime();
    const refreshDB = async (data) => {
        const date_time = (new Date(data.createdAt)).getTime();
        if(cur_time - date_time >= FULL_DAY) {
            await deleteUploadedFile(data.public_id, data.bg ? 'text' : 'upload');
            await Status.findByIdAndDelete(data._id);
        }
        return 'OK';
    }
    const statuses = await Status.find();
    const ops = statuses.map(status => refreshDB(status._doc).then(res => res));
    await Promise.all(ops);
    res.status(200).json({ status: 'success', message: 'Refreshed' });
})