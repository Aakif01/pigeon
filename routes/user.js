const express = require("express");
const router = express.Router();

const {getNewUserForm, createNewUser,getUserInfoForm, updateUserInfo, getLoginForm, loginUser, logoutUser, getNewFriendForm, createNewFriend} = require("../controllers/user.js")
const wrapAsync = require("../utils/wrapAsync.js");
const {isLoggedIn} = require("../middleware.js");
const multer = require("multer");
const { storage } = require("../cloudConfig");

const upload = multer({ storage });

router.get("/register", getNewUserForm);
router.post("/register", wrapAsync(createNewUser));

router.get("/user", isLoggedIn, getUserInfoForm);
router.post("/user/update", isLoggedIn, upload.single("dp"), wrapAsync(updateUserInfo));

router.get("/login", getLoginForm);
router.post("/login", loginUser);

router.get("/logout", logoutUser);

router.get("/new", getNewFriendForm);
router.post("/new", isLoggedIn, wrapAsync(createNewFriend));

module.exports = router;