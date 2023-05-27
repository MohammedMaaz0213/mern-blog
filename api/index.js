const express = require('express')
const cors = require('cors')
const app = express()
const mongoose = require('mongoose')
const User = require('./models/User')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const secret = 'dasdsadjqefjqwr320423rkdqpwdikasfqa'
const salt=bcrypt.genSaltSync(10);
const cookieParser = require('cookie-parser');
app.use(cors({credentials:true  , origin:'http://localhost:3000'}))
const multer  = require('multer')
const uploadMiddleware = multer({ dest: 'uploads/' })
const fs = require('fs')
const Post = require('./models/Post')

app.use('/uploads',express.static(__dirname + '/uploads'))
app.use(express.json())
app.use(cookieParser())


mongoose.connect('mongodb+srv://maaz:1234@cluster0.tzbagqm.mongodb.net/?retryWrites=true&w=majority')

app.post('/register' , async(req, res) => {
    try{
    const {username,password} = req.body;
    const userDoc = await User.create({username,password:bcrypt.hashSync(password,salt)})
    console.log(userDoc);
    res.json({userDoc})
    }catch(err){
        console.log(err.message);
        res.status(400).json(err)
    }
})

app.post('/login',async(req, res) => {
    const {username,password} = req.body;
    const userDoc = await User.findOne({username})
    const passOk = bcrypt.compareSync(password, userDoc.password)

    
    if(passOk){
       jwt.sign({username,id:userDoc._id}, secret, {}, (err,token)=>{
        if(err) throw err
      
        res.cookie('token',token).json({
            id:userDoc._id,
            username
        });
      
       })
    }
    else{
    res.status(400).json('wronggg credentials')
    }

})

app.get('/profile', (req, res)=>{
    const {token} = req.cookies;
    jwt.verify(token, secret,{},(err,info)=>{
        if(err) throw err
          res.json(info)

    })
})
app.post('/logout', (req, res)=>{
    
    res.cookie('token','').json("ok");
      
})

app.post('/post', uploadMiddleware.single('file') , async(req, res)=>{
  const {originalname,path} = req.file;
  const parts = originalname.split('.');
  const ext = parts[parts.length - 1];
  const newPath = path + '.webp';
  fs.renameSync(path, newPath);

  const {token} = req.cookies;
    jwt.verify(token, secret,{}, async(err,info)=>{
        if(err) throw err


        const {title,summary,content} = req.body;
        const postDoc = await Post.create({
         title,
         summary,
         content,
         cover:newPath,
         author:info.id
        })
        console.log(postDoc);

          res.json(info)

    })

  
}); 

app.put('/post',uploadMiddleware.single('file'),(req, res) => {
    let newPath=null
   if(req.file){
    const {originalname,path} = req.file;
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newPath = path + '.webp';
    fs.renameSync(path, newPath);
   }

   const {token} = req.cookies;
   jwt.verify(token, secret,{}, async(err,info)=>{
       if(err) throw err
       const {  id,title,summary,content} = req.body;
       const postDoc = await Post.findById(id);
       console.log(postDoc);

       const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id)
       if(!isAuthor) {
        return res.status(400).json("not theee author")
       }
       await postDoc.update({
        title,
        summary,
        content,
        cover:newPath?newPath:postDoc.cover
       })

         res.json(postDoc)

   })



})


app.get('/post', async (req, res) => {
    const posts = await Post.find({}).populate('author',['username']).sort({createdAt:-1}).limit(20)
    res.json(posts)
})

app.get('/post/:id',async(req,res)=>{
    const {id} = req.params;
    const postDoc = await Post.findById(id).populate('author', ['username'])
    
    res.json(postDoc)
})


app.listen(4000, ()=>{console.log('server');});
//mongodb+srv://maaz:1234@cluster0.tzbagqm.mongodb.net/?retryWrites=true&w=majority

