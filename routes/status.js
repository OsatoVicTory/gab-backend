const express = require("express");
const router = express.Router();
const { authUser } = require("../middleware/auth");
const upload = require('../middleware/multer');
const statusController = require("../controllers/statusController");

router.get('/fix', statusController.fix);

router.post("/post", authUser, upload.single('file'), statusController.uploadStatus);

router.post("/create", authUser, statusController.createStatus);

router.delete("/:id", authUser, statusController.deleteStatus);

router.get("/", authUser, statusController.fetchAllStatus);

router.patch("/:id", authUser, statusController.viewStatus);

router.get("/refresh", authUser, statusController.refresh);

module.exports = router;