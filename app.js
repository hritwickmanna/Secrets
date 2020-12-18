require('dotenv').config(); //dotenv for simple encryption away from github
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const findOrCreate = require("mongoose-findorcreate"); //use for find or create account
// const encrypt = require("mongoose-encryption"); // simple encryption
// const md5 = require("md5"); //hash md5
// const bcrypt = require("bcrypt");
// const saltRounds = 10;
//cookies and session
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy; //google oauth


const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

// session
app.use(session({
  secret: "I am Hritwick.", // any string applicable
  resave: false,
  saveUninitialized: false
}));

// passport and session
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("/mongodb://localhost:27017/userDB",{useNewUrlParser: true, useUnifiedTopology: true});

//extra in passport and session
mongoose.set("useCreateIndex", true);

const userSchema =new mongoose.Schema({
  email: String,
  password: String,
  googleId: String, //for google id
  secret: String
});
//encryption
// userSchema.plugin(encrypt, { secret: process.env.SECRET , encryptedFields: ["password"]});

//hash and salts
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate); // for find or create

const User = mongoose.model("User",userSchema);

// serialize and deserialize
passport.use(User.createStrategy());
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());
passport.serializeUser(function(user, done) { //for every serialize and deserialize
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

//google login calculation
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID, //stored in .env
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo" //retreiving information from userinfo
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile); //puri koondli nikalo
    User.findOrCreate({ googleId: profile.id }, function (err, user) { //find or create
      return cb(err, user);
    });
  }
));

app.get("/",function(req, res){
  res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })); //google page of login

  app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: "/login" }),
    function(req, res) {
      // Successful authentication, redirect to secret
      res.redirect("/secrets");
    });

app.get("/login",function(req, res){
  res.render("login");
});

app.get("/register",function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  // if(req.isAuthenticated()){ // cookies using to remember u r logged in
  //   res.render("secrets");
  // }else{
  //   res.redirect("/login");
  // }
  User.find({"secret": {$ne: null}}, function(err, foundUsers){
    if(err){
      console.log(err);
    }else{
      res.render("secrets", {usersWithSecrets: foundUsers});
    }
  })
});

app.get("/submit", function(req, res){
  if(req.isAuthenticated()){ // cookies using to remember u r logged in
    res.render("Submit");
  }else{
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
  User.findById(req.user.id, function(err, foundUser){
    if(err){
      console.log(err);
    }else{
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

app.post("/register", function(req,res){
  User.register({username: req.body.username}, req.body.password, function(err, user){//storing email and password
    if(err){
      console.log(err);
      res.redirect("/register");
    }else{
      passport.authenticate("local")(req, res, function(){ //authenticate
        res.redirect("/secrets"); // yeh wala res use hora hai
      });
    }
  });
});

// app.post("/register", function(req,res){
  // bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
  //     // Store hash in your password DB.
  //     const newUser = new User({ //registration
  //       email: req.body.username,
  //       password: hash //using hash encryption
  //         });
  //       newUser.save(function(err){
  //       if(!err){
  //         res.render("secrets");
  //       }else{
  //         res.send(err);
  //           }
  //       });
  //   });
// });
app.post("/login", function(req, res){

const user = new User ({
  username: req.body.username,
  password: req.body.password
});

req.login(user, function(err){ //checking login details
  if(err){
    console.log(err);
  }else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
      });
    }
  });
});

app.get("/logout", function(req, res){
req.logout();//logout
res.redirect("/");
});
//app.post("/login", function(req, res){
  // const email =  req.body.username;
  // const password = req.body.password;
  //
  //
  // User.findOne({email: email},function(err,foundUser){ //checking login details
  //   if(err){
  //     console.log(err);
  //   }else{
  //     if(foundUser){
  //         bcrypt.compare(password, foundUser.password, function(err, result) {
  //             if(result === true){
  //               res.render("secrets");
  //             }
  //         });
  //       }
  //     }
  // });
// });

app.listen(3000 || process.env.PORT , function() {
  console.log("Server started on port 3000");
});
