const sharp = require('sharp');
const { encode } = require('blurhash');
const { appError } = require("../utils/errorsHandler");
const cloudinary = require("../routes/cloudinary");
const fs = require('fs');

const uploadAndHash = async (file) => {
    try {
        const { public_id, secure_url } = await cloudinary.uploader.upload(
            file.path, { folder: "/Gab/messages", public_id: file.filename }
        );
        const { data, info } = await sharp(file.path)
            .ensureAlpha()
            .resize({ width: 200, height: 200, fit: 'cover' })
            .toFormat('jpeg', { mozjpeg: true }).raw()
            .toBuffer({ resolveWithObject: true });
        const encoded = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
        fs.unlinkSync(file.path);
        return { public_id, img: secure_url, hash: encoded };
    } catch (err) {
        throw new Error(err);
    }
}

exports.uploadMany = async (files) => {
    if(files?.length == 0) return [];
    const allUploads = files.map(file => {
        return uploadAndHash(file).then(res => {
            return { ...res };
        });
    });
    const response = await Promise.all(allUploads);
    return response;
}

exports.uploadSingle = async (file) => {
    const { public_id, secure_url } = await cloudinary.uploader.upload(
        file.path, { folder: "/Gab/account", public_id: file.filename }
    );
    fs.unlinkSync(file.path);
    return { img: secure_url, cloudinary_id: public_id };
}

exports.deleteUploadedFile = async (files, type = 'upload') => {
    let files_public_id = [];
    if(Array.isArray(files)) files_public_id = files.map(file => file.public_id);
    else files_public_id = [files];

    await cloudinary.api.delete_resources(
        files_public_id, { type, resource_type: 'image' }
    );
    return 'OK';
};

exports.uploadStatusFile = async (file) => {
    const { path, filename } = file;
    const { public_id, secure_url } = await cloudinary.uploader.upload(
        path, { folder: "/Gab/status", public_id: filename }
    );
    const { data, info } = await sharp(path)
        .ensureAlpha()
        .resize({ width: 200, height: 200, fit: 'cover' })
        .toFormat('jpeg', { mozjpeg: true }).raw()
        .toBuffer({ resolveWithObject: true });
    const encoded = encode(new Uint8ClampedArray(data), info.width, info.height, 4, 4);
    fs.unlinkSync(file.path);
    return { img: secure_url, public_id, hash: encoded };
}

exports.writeStatus = async (body) => {
    const hashes = {
        '#2891fa': 'L14r_;ktfQktk]fRfQfRfQfQfQfQ', 
        '#f5f533': 'L1SF-_-,WE-,~jj@j@j@ococococ', 
        '#f533d1': 'L1R~H4,^W.,^}1jufQjun+n+n+n+', 
        '#33f587': 'L16FQnl6fQl6qBfjfQfjfQfQfQfQ',
        '#ef4b4b': 'L1RZgf,@fQ,@}FjtfQjtfQfQfQfQ', 
        '#9d4bef': 'L1IB^lxKfQxK-HfRfQfRfQfQfQfQ'
    };
    const { bg, font, text } = body;
    const text_split = text.split('\n');
    let status_text = '';
    for(let t = 0; t < text_split.length; t++) {
        const line = text_split[t];
        for(let i = 0; i < line.length; i++) {
            status_text += line[i];
            if(i > 0 && i % 18 == 0) status_text += '\n';
        }
        if(t != text_split.length - 1) status_text += '\n';
    }
    const font_size = status_text.length >= 300 ? 12 : 14;
    const { secure_url, public_id } = await cloudinary.uploader.text(status_text, { 
        folder: "/Gab/status", background: bg, 
        font_family: font, font_size, font_color: 'white',
    });
    return { img: secure_url, public_id, hash: hashes[bg], bg };
}