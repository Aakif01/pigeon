require('dotenv').config()

const express = require("express");
const app = express();
const http = require("http");
const webSocket = require("ws");
const path = require("path");
const session = require("express-session");
const ejsMate = require("ejs-mate");
const cookieParser = require("cookie-parser");
const mongoose = require("mongoose");
const flash = require("connect-flash");
const MongoStore = require('connect-mongo').default;
const passport = require("passport");
const LocalStrategy = require("passport-local");
const ExpressError = require("./utils/ExpressError.js");
const User = require("./models/users/user.js");
const Conversation = require("./models/chat/conversation.js");
const Message = require("./models/chat/message.js");
const multer = require("multer");
const { storage } = require("./cloudConfig");
const userRoutes = require("./routes/user.js");
const chatRoutes = require("./routes/chat.js");
const users = require("./usersStore.js");

const upload = multer({ storage });

const server = http.createServer(app);

let dbUrl = process.env.ATLASDB_URL;

const store = MongoStore.create({
  mongoUrl: dbUrl,
  crypto: {
    secret: process.env.SECRET_KEY
  },
  touchAfter: 24*3600
});

store.on("error", (error) => {
  console.log("ERROR in MONGO SESSION STORE", error)
})

const sessionVariables = {
  store: store,
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: true
}

const sessionParser = session(sessionVariables);


main()
.then( () => console.log("Connected to backend"))
.catch( (err) => console.log(err) );

async function main(){
  await mongoose.connect(dbUrl, {dbName: "pigeon"});
  console.log("Connected DB:", mongoose.connection.name);
}

app.engine("ejs", ejsMate);
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static("public"));
app.use(cookieParser());
app.use(sessionParser);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.set("includes", path.join(__dirname, "includes"));

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

passport.use(new LocalStrategy({ usernameField: "phone" }, User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use( async(req, res, next) => {
  if(req.path !== "/pigeon"){
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  }
  res.locals.user = req.user;
  
  next();
})

app.get("/", (req, res) => {
  res.redirect("/pigeon");
})

app.use("/pigeon", chatRoutes);
app.use("/pigeon", userRoutes);

const wss = new webSocket.Server({ server });

wss.on("connection", (ws, req) => {
  console.log("updated to websocket");
  
  sessionParser(req, {}, async () => {
    
    if (!req.session.passport) {
      ws.close(1008, "Unauthorized");
      return;
    }
    
    let phone = req.session.passport.user;
    

      
      let user = await User.findOne({ phone });
      users[user._id.toString()] = ws;
      if(users[user._id.toString()]){
        console.log("New user joined");
      } else{
        console.log("error in storing user")
      }
      
      ws.on("close", () => {

  console.log("Socket closed for:", user._id.toString());

  delete users[user._id.toString()];

});
    
    ws.on("message", async (msg) => {
    let data = JSON.parse(msg.toString());
    
    
    if(data.type == "message"){
      let convoId = data.conversation;
      
      let conversation = await Conversation.findById(convoId);
      if(!conversation){
        console.log("Conversation not found");
        return;
      }
       
      let friendId = conversation.members.find( m => m.toString() != user._id.toString());

      let friend = await User.findById(friendId);
   
      if(!friend){
        console.log("Friend not found");
        return;
      }
      
      if(!data.message){
        console.log("Message text is required");
        return;
      }
      
      let message = new Message({
        sender: user._id,
        conversation: convoId,
        message: data.message
      });
      
      await message.save();
      
      await Conversation.findByIdAndUpdate( convoId, { lastMessageAt: new Date() });
      
      let isFriend = friend.friends.some( friend => friend.user.toString() === user._id.toString());
      
      if(!isFriend){
        await User.updateOne({ _id: friendId, "friends.user": { $ne: user._id } }, {
    $push: {
      friends: {
        convoId: convoId,
        user: user._id,
        firstName: `+91${phone}`,
        lastName: ""
      }
    }
  })
  
      if(users[friendId.toString()]){
       users[friendId.toString()].send(JSON.stringify({
         type: "new-friend",
         convoId: convoId,
         firstName: `+91${phone}`,
       }))
      }
      }
      if(users[friendId.toString()]){
        console.log("Friend found")
        users[friendId.toString()].send(JSON.stringify({
          type: "new-message",
          conversation: convoId,
          sender: user._id,
          message: data.message
        }))
      }else{
        console.log("Friend not found in users");
      }
      
      ws.send(JSON.stringify({
          type: "new-message",
          conversation: convoId,
          sender: user._id,
          message: data.message
        }))
      }
    })
  });
  
  });
  
  app.all(/.*/, (req, res, next)=>{
  next(new ExpressError(404, "Page not found"));
});
  
  app.use( (err, req, res, next) => {
  let {statusCode=500, message="Something went wrong"} = err
  res.status(statusCode).render("error.ejs", {statusCode, message})
})
  
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});