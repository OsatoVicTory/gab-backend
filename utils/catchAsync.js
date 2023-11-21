const { appError } = require("./errorsHandler");


module.exports = fn => {
    return (req, res, next) => {
        fn(req, res, next).catch(err => {
            console.log(err);
            appError(res, 500, "Sorry Something Went Wrong. Check Internet And Try Again")
        })
    }
}