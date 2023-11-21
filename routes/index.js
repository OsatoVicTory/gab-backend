const express = require("express");
const router = express.Router();
const user = require("./user");
// const group = require("./group");
const directMessage = require('./dm');
// const groupMessage = require('./gc');
const google = require("../providers/google");
const status = require('./status');

router.use("/api/v1/user", user);
// router.use("/api/v1/group", group);
router.use("/api/v1/google", google);
router.use("/api/v1/dm", directMessage);
// router.use("/api/v1/gc", groupMessage);
router.use("/api/v1/status", status);

module.exports = router;