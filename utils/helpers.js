const fs = require('fs');
exports.convertToBase64URL = (obj) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(obj);
        reader.onload = () => resolve(reader.result);
        reader.onerror = (err) => reject(err);
    });
};

exports.convertToBuffer = (base64) => {
    const string = base64.split(",")[1];
    return Buffer.from(string, 'base64');
}

exports.removeFile = (path) => {
    fs.unlinkSync(path);
}
exports.extractUserAccount = (data) => {
    if(!data?._doc) return null;
    let { 
        img, userName, _id, phoneNumber, about, 
        lastSeen, userColor, createdAt, aboutUpdate 
    } = data._doc;
    _id = _id.toString();
    return { 
        img, userName, _id, phoneNumber, about, 
        lastSeen, userColor, aboutUpdate, createdAt 
    };
}

exports.getRandomColor = () => {
    const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let color = '#';
    for(var i=0;i<6;i++) {
        if(i%2) color += Math.floor(Math.random() * 10);
        else color += alpha[Math.floor(Math.random() * 25)];
    }
    return color;
}

exports.sameTime = (time, msg) => {
    const time_date = new Date(time);
    const cur_date = new Date();
    const msg_date = new Date(msg);
    const msg_date_str = String(msg_date);

    if(String(time_date).slice(0, 15) == msg_date_str.slice(0, 15)) {
        return null; 
    } else if(msg_date.getFullYear() !== cur_date.getFullYear()) {
        return msg_date_str.slice(4, 15);
    } else if (msg_date.getMonth() !== cur_date.getMonth()) {
        return msg_date_str.slice(0, 10);
    } else {
        let diff = cur_date.getDate() - msg_date.getDate();
        if(Math.abs(diff) > 1) return msg_date_str.slice(0, 3);
        else if(diff == 1) return `Yesterday`;
        else return "Today";
    }
}
