const express = require("express");
const router = express.Router();
const { authUser } = require("../middleware/auth");
const upload = require('../middleware/multer');
const dmController = require("../controllers/dmController");

router.get('/test/:id', authUser, dmController.test);

router.post("/send", authUser, upload.array('files'), dmController.sendMessage);

router.post("/edit", authUser, upload.array('files'), dmController.editMessage);

router.patch('/react', authUser, dmController.react);

router.get('/received-all', authUser, dmController.receivedAllMessage);

router.get('/received/:id', authUser, dmController.receivedMessage);

router.get('/read-all/:userId', authUser, dmController.readAllMessage);

router.get('/read/:id', authUser, dmController.readMessage);

router.delete("/me/:id", authUser, dmController.deleteMessageForMe);

router.delete("/all/:id", authUser, dmController.deleteMessageForAll);

module.exports = router;
