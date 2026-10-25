const express = require('express');
const cartRoutes = require("./routes/cart.routes");
const cookieParser = require("cookie-parser");

const app = express();

// middlewares
app.use(cookieParser());
app.use(express.json());

app.get('/',(req,res)=>{
    res.status(200).json({message:"Cart Service is running..."})
})

// api routes
app.use("/api/cart", cartRoutes);



module.exports = app;