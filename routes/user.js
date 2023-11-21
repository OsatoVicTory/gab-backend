const express = require("express");
const router = express.Router();
const { authUser } = require("../middleware/auth");
const upload = require('../middleware/multer');
const userController = require("../controllers/user");
// const loggedInController = require('../controllers/loggedIn');
const loggedInController = require('../controllers/logIn');
const otherController = require('../controllers/others');
// const forgotpasswordController = require("../controller/forgotpasswordController");
// const passwordresetController = require("../controller/resetpasswordController");
// const mailServices = require("../controller/mailsController");

router.get("/fix", userController.fix);

router.post("/login", userController.logInUser);

router.post("/signup", userController.signUpUser);

router.post("/save-contact", authUser, userController.saveContact);

router.post("/bar-users", authUser, userController.barUsers);

router.get("/verify-account/:token", userController.verifyAccount);

// router.get("/user-logged-in", authUser, loggedInController.loggedIn);

router.get("/user-logged-in", authUser, loggedInController.logIn);

router.get("/get-user/:id", authUser, userController.getUser);

router.get("/block/:id", authUser, userController.blockUser);

router.patch("/pin/:id", authUser, userController.pinUser);

router.get('/find-user/:value', otherController.findUser);

router.get('/good-userdetails/:userDetails', otherController.goodUserDetails);

router.get('/recommend-users', authUser, otherController.recommendUsers);

router.post("/update-account", authUser, upload.single('file'), userController.updateAccount);

router.get("/logout", userController.logOutUser);

module.exports = router;