exports.appError = (res, errorCode, message) => {

    return res.status(errorCode).json({
        status: 'failed',
        message: message
    })
}
