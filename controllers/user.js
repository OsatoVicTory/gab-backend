const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const jwt = require("jsonwebtoken");
const Users = require("../models/users");
// const DirectMessages = require('../models/directMessages');
const bcrypt = require("bcrypt");
const { getRandomColor, extractUserAccount } = require("../utils/helpers");
const { deleteUploadedFile, uploadSingle } = require("../utils/upload");
const { sendCookie } = require("./sendCookie");
// const cloudinary = require("../routes/cloudinary");
require("dotenv").config();

exports.fix = catchAsync(async (req, res) => {
    const users = await Users.find();
    console.log(users);
    for(let user of users) {
        const { contacts, _id, userName } = user._doc;
        await Users.findByIdAndDelete(_id);
    }
    // const user = await Users.findById(req.user.id);
    // if(user._doc.userName == 'Osato9') {
    //     await Users.findByIdAndDelete(req.user.id, { admin: true });
    // }
    return res.status(200).json({status: "done"})
})
exports.logInUser = catchAsync(async (req, res) => {
    
    const { email, password } = req.body;
    const user = await Users.findOne({ email });


    if(!user) return appError(res, 500, "Invalid Email address");

    const validPassword = await bcrypt.compare(password, user.password);

    if(!validPassword) return appError(res, 500, "Invalid Password");

    const tokenData = { id: user._doc._id.toString() };

    const token = await jwt.sign(tokenData, process.env.MYSECRET);

    if(!user.isVerified) {

        return res.status(200).json({
            status: 'failed',
            message: "User Not Verified. Redirecting to Verification Page",
            token
        })
    }

    // sendCookie(res, token);
    return res.status(200).json({
        status: 'success',
        message: "Logged In Successfully",
        user: user._doc, token
    })
});

exports.signUpUser = catchAsync(async (req, res, next) => {

    const { email, password } = req.body;

    const userExist = await Users.findOne({ email });
    
    if(userExist) return appError(res, 400, "User Already Exists");

    const hashedPassword = await bcrypt.hash(password, 10);

    const userData = {
        ...req.body,
        password: hashedPassword,
        isVerified: false,
        userColor: getRandomColor(),
    }
    const newUser = new Users(userData);

    const tokenData = { id: newUser._id.toString() };
    const token = jwt.sign(tokenData, process.env.MYSECRET);

    await newUser.save();

    res.status(200).json({
        status: 'success',
        message: 'User Created. Redirecting to Verification Page',
        token
    });

});

exports.verifyAccount = catchAsync(async (req, res) => {

    const decodedToken = await jwt.verify(req.params.token, process.env.MYSECRET);

    await Users.findByIdAndUpdate(decodedToken.id, {
        isVerified: true
    });

    res.status(200).json({
        status: 'success',
        message: 'Account Verified Successfully. Redirecting to Log in'
    })

});

exports.logOutUser = catchAsync(async (req, res) => {
    await Users.findByIdAndUpdate(req.user.id, { lastSeen: String(new Date()) });
    res.clearCookie("GAB");
    return res.status(200).json({
        status: 'success',
        message: 'Logged Out Successfully'
    });
});

exports.updateAccount = catchAsync(async(req, res) => {
    let { img, cloudinary_id } = req.body;
    const { path } = req?.file||{};
    if(path) {
        if(cloudinary_id) await deleteUploadedFile(cloudinary_id);
        const resp = await uploadSingle(req.file);
        img = resp.img;
        cloudinary_id = resp.cloudinary_id;
    }
    const data = {...req.body, img, cloudinary_id};
    const User = extractUserAccount(
        await Users.findByIdAndUpdate(req.user.id, {...data}, { new: true })
    );
    res.status(200).json({ status: 'success', user: User });
});

exports.getUser = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = extractUserAccount(await Users.findById(id));
    const { blocked_users } = (await Users.findById(req.user.id))._doc;
    const isBlocked = blocked_users.find(b => b.userId === id) ? true : false;
    user.isBlocked = isBlocked;
    res.status(200).json({ status: 'success', message: 'success', user });
});

exports.saveContact = catchAsync(async (req, res) => {
    const { id } = req.user;
    let { contacts } = await Users.findById(id);
    const { userId } = req.body;
    let c = 0;
    for(; c < contacts.length; c++) {
        if(contacts[c].userId == userId) {
            contacts[c] = { ...contacts[c], ...req.body };
            break;
        }
    }
    if(c >= contacts.length) contacts.push(req.body);
    await Users.findByIdAndUpdate(id, { contacts });
    res.status(200).json({ message: 'Saved successfully' });
});

exports.pinUser = catchAsync(async (req, res) => {
    const user = await Users.findById(req.user.id);
    const { pinned } = user._doc;
    let newData = [], found = false;
    for(var p of pinned) {
        if(p == req.params.id) found = true;
        else newData.push(p);
    }
    if(!found) newData.push(req.params.id);
    const data = await Users.findByIdAndUpdate(req.user.id, { pinned: newData }, { new: true });
    res.status(200).json({
        message: !found ? 'Pinned' :'Unpinned',
        status: 'success', pinned: data._doc.pinned,
    });
});

exports.barUsers = catchAsync(async (req, res) => {
    const okUsers = req.body;
    const user = await Users.findById(req.user.id);
    const contacts = [];
    for(const contact of user._doc.contacts) {
        if(okUsers.includes(contact.userId)) contacts.push({ ...contact, barred: false });
        else contacts.push({ ...contact, barred: true });
    }
    await Users.findByIdAndUpdate(req.user.id, { contacts });
    res.status(200).json({ message: 'Updated successfully', status: 'success', contacts });
});

exports.blockUser = catchAsync(async (req, res) => {
    const { id } = req.params;
    const user = await Users.findById(req.user.id);
    const time = String(new Date());
    const data = user._doc.blocked_users;
    let found = false, blocked_users = [];
    for(let i = 0; i < data.length; i++) {
        if(data[i].userId == id) {
            found = true;
        } else blocked_users.push(data[i]);
    }
    if(!found) blocked_users.push({ userId: id, time });
    await Users.findByIdAndUpdate(req.user.id, { blocked_users });
    res.status(200).json({ message: 'Blocked successfully', status: 'success', blocked_users });
});