const express = require("express");
const router = express.Router();
const { authUser } = require("../middleware/auth");
const upload = require('../middleware/multer');
const groupController = require("../controllers/group");

router.get('/fix', groupController.fix);

router.post("/create", authUser, upload.single('file'), groupController.createGroup);

router.get('/join/:id', authUser, groupController.joinGroup);

router.get('/fetch/:id', authUser, groupController.fetchGroup);

router.post('/edit/:id', authUser, upload.single('file'), groupController.editGroup);

router.patch("/admin/:id/:userId", authUser, groupController.makeAdmin);

router.delete("/remove/:id/:userId", authUser, groupController.removeParticipant);

router.delete("/:id", authUser, groupController.exitGroup);

module.exports = router;