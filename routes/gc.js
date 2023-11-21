const express = require("express");
const router = express.Router();
const { authUser } = require("../middleware/auth");
const upload = require('../middleware/multer');
const gcController = require("../controllers/gcController");

router.get('/test/:id', authUser, gcController.test);

router.post("/send", authUser, upload.array('files'), gcController.sendMessage);

router.post("/edit", authUser, upload.array('files'), gcController.editMessage);

router.patch('/react', authUser, gcController.react);

router.get('/fetch-with-messages/:id', authUser, gcController.fetchWithMessages);

router.get('/received-all', authUser, gcController.receivedAllMessage);

router.get('/received/:id', authUser, gcController.receivedMessage);

router.get('/read-all/:groupId', authUser, gcController.readAllMessage);

router.get('/read/:id', authUser, gcController.readMessage);

router.delete("/me/:id", authUser, gcController.deleteMessageForMe);

router.delete("/all/:id", authUser, gcController.deleteMessageForAll);

module.exports = router;