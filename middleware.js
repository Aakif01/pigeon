const Conversation = require("./models/chat/conversation.js");

function isLoggedIn(req, res, next){
  if(!req.user) {
    return res.redirect("/pigeon/login");
    
  }
  next();
}

async function isMember(req, res, next) {
  try {
    let { convoId } = req.params;

    let conversation = await Conversation.findOne({
      _id: convoId,
      members: req.user._id
    });

    if (!conversation) {
      req.flash("error", "permission denied")
      return res.redirect("/pigeon");
    }

    req.conversation = conversation;

    next();

  } catch (err) {
    console.log(err);
    return res.redirect("/pigeon");
  }
}

module.exports = {isLoggedIn, isMember};