const { appError } = require("../utils/errorsHandler");
const catchAsync = require("../utils/catchAsync");
const DirectMessages = require('../models/directMessages');
const Users = require('../models/users');
const { uploadMany, deleteUploadedFile } = require("../utils/upload");
// const cloudinary = require("../routes/cloudinary");
const { parallelDMClearing, parallelDeleteDMForMe } = require('../utils/delete');
const puppeteer = require("puppeteer");
// const cheerio = require('cheerio');

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
    const browser = await puppeteer.launch({
        headless: true,
    });

    // Open a new page
    const page = await browser.newPage();

    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:91.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 Firefox/91.0");
    await page.setExtraHTTPHeaders({
        'accept-language': 'en-US,en;q=0.9',
        'referer': 'https://www.recaptcha.net/',
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7", 
        "Accept-Encoding": "gzip, deflate, br, zstd", 
        "Connection": "keep-alive",
        "Accept-Language": "en-US,en;q=0.9,ru;q=0.8", 
        "Sec-Ch-Ua": "\"Chromium\";v=\"130\", \"Google Chrome\";v=\"130\", \"Not?A_Brand\";v=\"99\"", 
        "Sec-Ch-Ua-Mobile": "?0", 
        "Sec-Ch-Ua-Platform": "\"Windows\"", 
        "Sec-Fetch-Dest": "document", 
        "Sec-Fetch-Mode": "navigate", 
        "Sec-Fetch-Site": "cross-site", 
        "Sec-Fetch-User": "?1", 
        "Upgrade-Insecure-Requests": "1",
    });

    page.on('response', (response) => {
      console.log('Response received from puppeteer:', response);
    });
    
    await page.goto(url, {
        // waitUntil: "domcontentloaded"
        waitUntil: "networkidle2"
    });
    
    function parseImgUrl(URL) {
        if(!URL) return URL;
        if(['https', 'www'].find(site => URL.startsWith(site))) return URL;
        if(URL.startsWith('//')) return `https:${URL}`;
        return url+URL;
    };

    // const html = await page.content();
    // const $ = cheerio.load(html);
    const response = { title: url, pTag: url, img: url, site: url };

    const r = await page.evaluate(() => {
        const metaTag = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        const p = document.querySelector('meta[property="og:description"]')?.getAttribute('content');
        const img = document.querySelector('meta[property="og:image"]')?.getAttribute('content');
        const url = document.querySelector('meta[property="og:url"]')?.getAttribute('content');
        const FOUND_DATA = metaTag || p ? true : false;
        return { pTag: p, title: metaTag, img, url, FOUND_DATA };
    });
    
    const response_data = { pTag: r.pTag || url, title: r.title || url, img: parseImgUrl(r.img), FOUND_DATA: r.FOUND_DATA };
        
    // const title = $('meta[property="og:title"]').attr('content');
    // const pTag = $('meta[property="og:description"]').attr('content');
    // response.title = title || url;
    // response.pTag = pTag || url;
    // response.img = parseImgUrl($('meta[property="og:image"]').attr('content'));
    // response.site = $('meta[property="og:url"]').attr('content') || url;
    // response.FOUND_DATA = title || pTag ? true : false;

    await browser.close();
    
    res.status(200).json(response_data);
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
