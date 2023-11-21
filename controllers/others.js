const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const Users = require('../models/users');
const { extractUserAccount } = require('../utils/helpers');

exports.findUser = catchAsync(async (req, res) => {
    const user = extractUserAccount(await Users.findOne({
        $or: [ 
            { userName: { $regex: req.params.value } },
            // { phoneNumber: { $regex: req.params.value } }
        ]
    }));
    res.status(200).json({
        message: 'success', user
    })
});

exports.goodUserDetails = catchAsync(async (req, res) => {
    const [key, value] = req.params.userDetails.split('=');
    const user = await Users.findOne({ [key] : value });
    if(!user) {
        return res.status(200).json({ status: 'success', message: `${key} available !` });
    } else {
        return res.status(200).json({ status: 'error', message: `${key} unavailable` });
    }
});

exports.recommendUsers = catchAsync(async (req, res) => {
    const { id } = req.user;
    let mp = [], vis = new Map();
    let contactsMap = new Map();
    const fetchAccount = async (userId) => {
        return await Users.findById(userId);
    } 
    const userContacts = (await Users.findById(id))._doc.contacts;
    for(let contact of userContacts) contactsMap.set(contact.userId, 1);
    const DFS = (par, node) => {
        vis.set(par, 1);
        fetchAccount(node).then(user => {
            let nodeScore = 0;
            for(let { userId } of user._doc.contacts) {
                if(contactsMap.has(userId)) nodeScore++;
                if(!vis.has(userId)) nodeScore += DFS(node, userId)||0;
            }
            if(!contactsMap.has(user._id)) mp.push([extractUserAccount(user), nodeScore]);
            return nodeScore;
        });
    }
    DFS(id, id);
    console.log('recommed-mp', mp);
    const data = mp.sort((x, y) => y[1] - x[1]).map(m => m[0]).filter(val => !contactsMap.has(val._id)); 
    return res.status(200).json({
        status: 'success',
        users: data
    })
});