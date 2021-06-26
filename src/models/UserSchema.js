const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')


const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:[true, 'name is required'],
        trim:true
    },
    username:{
        type:String,
        required:true,
        unique:true,
        trim:true
    },
    email:{
        trim:true,
        type:String,
        required:true,
        unique:true,
        lowercase:true 
    },
    password:{
        trim:true,
        type:String,
        required:true
    },
    cpassword:{
        trim:true,
        type:String,
        required:true 
    },
    active : {
        type:Boolean,
        default:false
    },
    validataion:{
        data:String,
        default:''
    },
    resetLink:{
        data:String,
        default:''
    }
})


//bcryption

userSchema.pre('save', async function (next){
    if(this.isModified('password')){
       this.password =   await bcrypt.hash(this.password,15);
       this.cpassword =   await  bcrypt.hash(this.cpassword,15);
    }
    next();    
})


const User = new mongoose.model("User",userSchema);
module.exports = User;