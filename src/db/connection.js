const mongoose = require('mongoose');

mongoose.connect(process.env.DATABASE,{
    useNewUrlParser:true,
    useUnifiedTopology:true,
    useFindAndModify:true,
    useCreateIndex:true
}).then(()=> console.log("connection successful"))
.catch((err)=>console.log(err));


