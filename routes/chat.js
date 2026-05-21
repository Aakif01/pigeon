const express = require("express");
const router = express.Router();

const {getLoadingForm, getChatData, getChatPage} = require("../controllers/chat.js")
const {isLoggedIn, isMember} = require("../middleware.js");
const wrapAsync = require("../utils/wrapAsync.js");

router.get("/", isLoggedIn, getLoadingForm);
router.get("/data", isLoggedIn, wrapAsync(getChatData));

router.get("/chat/:convoId", isLoggedIn, isMember, wrapAsync(getChatPage));

module.exports = router;