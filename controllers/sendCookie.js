exports.sendCookie = (res, data) => {
    // res.header("Pride_Auth", data);
    res.cookie("GAB", data, {
        httpOnly: true,
        maxAge: 2680000000,
        sameSite: 'none',
        secure: false
    })
}