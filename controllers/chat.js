const User = require("../models/users/user.js");
const Conversation = require("../models/chat/conversation.js");
const Message = require("../models/chat/message.js");
const users = require("../usersStore.js")

const getLoadingForm = (req, res) => {
  res.status(200).render("chat/loading.ejs")
}

const getChatData = async(req, res) => {
  let userId = req.user._id;
  let user = await User.findById(userId).populate("friends.user").populate("friends.convoId");
  
  user.friends.sort((a, b) => {

  let timeA = a.convoId?.lastMessageAt || 0;
  let timeB = b.convoId?.lastMessageAt || 0;

  return timeB - timeA;

});
  
  res.render("chat/home.ejs", { user })
}

const getChatPage = async(req, res) => {
  let {convoId} = req.params
  let conversation = req.conversation;
  let messages = await Message.find({ conversation: convoId });
  
  let friendId = conversation.members.find(
  member => member.toString() !== req.user._id.toString()
);

  let friend = await User.findById(friendId);
  
  let friendInfo = req.user.friends.find( f => f.user.toString() == friendId.toString());
  
  let name = friendInfo.firstName + " " + friendInfo.lastName || " ";
  
  res.render("chat/chat.ejs", {friend, messages, convoId, name})
}

module.exports = {getLoadingForm, getChatData, getChatPage};