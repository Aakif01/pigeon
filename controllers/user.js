const User = require("../models/users/user.js");
const Conversation = require("../models/chat/conversation.js");
const passport = require("passport");

const getNewUserForm = (req, res) => {
  res.status(200).render("user/register.ejs")
}

const createNewUser = async(req, res, next) => {
  try{
    
  let {phone, password} = req.body;
  
  let newUser = new User({
    phone: phone,
    friends: []
  });
  
  const registeredUser = await User.register(newUser, password);
  
  req.login(registeredUser, (err) => {

      if (err) return next(err);

      res.redirect("/pigeon/user"); 

    });
  } catch(err){
    console.log(err);
    req.flash("error", err.message)
    res.redirect("/pigeon/register");
  }
}

const getUserInfoForm = (req, res) => {
  res.render("user/user.ejs");
}

const updateUserInfo = async (req, res) => {

    try {

      let userId = req.user._id;

      let updateData = {};

      if (req.body.username && req.body.username.trim() !== "") {

        updateData.username =
          req.body.username.trim();

      }

      if (req.file) {

        updateData.profile = {
          url: req.file.path,
          filename: req.file.filename
        };

      }

      if (Object.keys(updateData).length > 0) {

        await User.findByIdAndUpdate(
          userId,
          updateData
        );

      }

      res.redirect("/pigeon/");

    } catch (err) {

      req.flash("error", err.message)
      res.redirect("/pigeon/user");

    }

  }
  
const getLoginForm = (req, res) => {
  res.status(200).render("user/login.ejs")
}

const loginUser = passport.authenticate("local", {
    successRedirect: "/pigeon",
    failureRedirect: "/pigeon/login",
    failureFlash: true
  })
  
const logoutUser = (req, res, next) => {
  req.logout( (err) => {
    if(err){
      next(err);
    }
    req.flash("success", "You are logged out!")
    res.redirect("/pigeon/login")
  });
}

const getNewFriendForm = (req, res) => {
  res.status(200).render("user/friend.ejs")
}

const createNewFriend = async(req, res) => {
  let {phone, firstName, lastName} = req.body;
  
  if(!firstName){
    if(lastName){
      firstName = lastName;
      lastName = "";
    } else{
      firstName = `+91${phone}`
    }
  }
  
  if(!phone){
    req.flash("error", "Phone Number is required");
    return res.status(400).redirect("/pigeon/new")
  }
  
  let friend = await User.findOne({ phone }).populate("friends.user");
  if(!friend){
    req.flash("error", "user not found. Invite them on pigeon")
    return res.status(404).redirect("/pigeon");
  }
  
  let userId = req.user._id;
  
  let user = await User.findById(userId).populate("friends.user");
  
  if(friend._id.toString() === userId.toString()) return res.redirect("/pigeon");
  
  let convo = await Conversation.findOne({ members: { $all: [userId, friend._id] } });

  if (!convo) {
    convo = new Conversation({ members: [userId, friend._id] });
    await convo.save();
  }
  await User.updateOne({ _id: userId, "friends.user": { $ne: friend._id } }, {
    $push: {
      friends: {
        convoId: convo._id,
        user: friend._id,
        firstName,
        lastName
      }
    }
  }
);

res.status(201).redirect("/pigeon");
}

module.exports = {getNewUserForm, createNewUser,getUserInfoForm, updateUserInfo, getLoginForm, loginUser, logoutUser, getNewFriendForm, createNewFriend};