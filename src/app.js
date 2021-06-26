require('dotenv').config();
const express = require('express');
const app = express();
require('./db/connection')
const User = require('../src/models/UserSchema');
const bcrypt = require('bcryptjs')
const validator = require('email-validator')
const hbs = require('hbs');
const path = require('path');
const nodemailer = require('nodemailer')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const port = process.env.PORT || 3000;



app.use(express.json());
app.use(express.urlencoded({extended:false}));

const static_path = path.join(__dirname,"../public");
app.use(express.static(static_path));

//I have used hbs for testing
app.set('view engine','hbs') 

app.get('/',(req,res)=>{
   res.render('index');
})


app.get('/register',(req,res)=>{
  res.render("register")
})

app.get('/login',(req,res)=>{
  res.render("login")
})

let transporter = nodemailer.createTransport({
          service:'gmail',
          auth:{
              user:'server@gmail.com',
              pass:"xxxxxxxx"   
          }
      });

app.post('/register', async (req, res) => {

  const { name, username, email, password, cpassword } = req.body;

  if (!name || !username || !email || !password || !cpassword) {
       res.json({ msg: " fill the form properly " })
  }

  try {
       //we will check email or username already exist  or not
      const emailExist = await User.findOne({ email: email })
      const usernameExist = await User.findOne({ username: username });

      if (emailExist || usernameExist) {
          return res.json({ msg: "already exist in db" })
      }

      const user = new User({ name, username, email, password, cpassword });

       //encryption of password and cpassword
           //done
           await user.save();
      //we have to use nodemailer here for confirmation of account

      const token = jwt.sign({ email },process.env.SECRET_KEY,{expiresIn:'5m'})
      // console.log(token);


      let mailOptions = {
        from: 'server@gmail.com',
        to: email,
        subject: 'Activate your Account',
        html: `
             <h2> please click the link to verify your Account <h2/>
             <p>${process.env.SERVER_URL}/activateaccount/${token}</p>
        `
      };

         transporter.sendMail(mailOptions, (err, info)=>{
          if (err) {
            console.log(err );
          } else {   
              console.log('Email sent: ' + info.response);
              return User.updateOne({validation: token}, function(err, success){
                if(err){
                  return res.status(400).json({error:'Validation  error'});
                }else{
                   
                  res.json({message:'Email sent for validation, click the link for activaton of your account'})
                
                }  
           }) 
          }
        });

        
        // save data and update validation and active in db
        //remaining  

  } catch (err) {
      //   res.send("already exist")
      console.log(err);
  }
})

//validation after clicking on the link sent on email
app.put('/activateaccount',(req,res)=>{
     const { validatoin } = req.body;//validation is nothing but token that we have send in email 
     
     if(!validatoin){
      return res.status(401).json({error:"Validation error"})
    }
   
    jwt.verify(validatoin,process.env.SECRET_KEY, (err,decodeData)=>{
      if(err){
        return res.status(401).json({error:'Link is expired, please try again'})
      }
      User.findOne({validatoin}, (err,user)=>{
         if(err || !user){
           return res.status(400).json({error:'user with this token doen not exist'})
         }
       
          User.updateOne({_id:user._id},{active:true})
          await user.save();
          res.status(200).json({msg:'password updated successfully'});
      })

    })

})

app.post('/login', async (req, res) => {

  try {

      const { userid, password } = req.body;
  
      if(!userid || !password)
         return res.json({ err : "enter data"})

      //we have to validate that user input is username or email
       //on the basis of that we will check in our database that user exist or not  

      const isEmail = validator.validate(userid);
      let userLogin;
      if(isEmail){
          userLogin = await User.findOne({ email: userid });
      }else{
          userLogin = await User.findOne({ username: userid });
      }
         
      //if user not exist 
      if(!userLogin) return res.json({ err : "enter data error"})
      
      //if exist then we will check his password , wheather it is correct or not
      const isMatch = await bcrypt.compare(password,userLogin.password);

      // userLogin.active is because initially it is false and after the validation of email, it becomes true;

       if (isMatch && userLogin.active){
        
          //here we will render our home page
          //res.json({ err : " login successfully"})
          //we will generate token for that user
         res.render('index');

      }else res.json({ err : "enter data error"})

  } catch (err) {
      console.log(err);
  }
})


app.put('/forgetpassword', async (req,res)=>{
  const { email } = req.body;

 await  User.findOne({email:email}, (err, user)=>{
    if(err || !user){
      console.log(user)
      return res.status(400).json({error:"user with this email doesnot exist"})
    }
   
    const token = jwt.sign({_id : user._id},process.env.SECRET_KEY_FORGET_PASSWORD,{expiresIn:'5m'});

     let mailOptions = {
          from: 'server@gmail.com',
          to: email,
          subject: 'Reset password Link',
          html: `
               <h2> please click the link to Reset your password<h2/>
               <p>${process.env.CLIENT_URL}/resetpassword/${token}</p>
          `
        };

         transporter.sendMail(mailOptions, (err, info)=>{
          if (err) {
            console.log(err );
            return res.status(400).json({error:'mail send error'})
          } else {   
              console.log('Email sent: ' + info.response);

              return User.updateOne({resetLink: token}, function(err, success){
                   if(err){
                     return res.status(400).json({error:'Reset password link error'});
                   }else{
                      
                     res.json({message:'Email sent for rest password, follow the instructions'})
                   
                   }  
              })
          }
      });
  })
})

app.put('/resetpassowrd', async (req,res)=>{
      const {resetLink, newPass} = req.body;
    // for testing we will pass resetLink and for development this link will pass from client side through url
      if(!resetLink){
         return res.status(401).json({error:"Authentication error"})
      }

      jwt.verify(resetLink,process.env.SECRET_KEY_FORGET_PASSWORD, (err,decodeData)=>{
        if(err){
          return res.status(401).json({error:'Link is expired, please try again'})
        }
        User.findOne({resetLink}, (err,user)=>{
           if(err || !user){
             return res.status(400).json({error:'user with this token doen not exist'})
           }
           const newpassword = await bcrypt.hash(newPass,15);

            User.updateOne({_id:user._id},{password:newpassword,cpass:newpassword})
            await user.save();
             res.status(200).json({msg:'password updated successfully'});
        })

      })
})


app.listen(port,(err)=> console.log(`sever is running at port ${port}`));