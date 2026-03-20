const express = require("express");
const router = express.Router()
const bcrypt = require("bcrypt")

router.get("/", (req, res) => {
    res.render('register.ejs');

})

router.post("/", async (req, res) => {
    try{
        console.log(req.body)
        const username = req.body.username
        console.log(username)

        const hashedpassword = await bcrypt.hash(req.body.password, 10) 
        console.log(hashedpassword)
        res.redirect("/")
    }
    catch(error){
        console.log(error)

    }
})

module.exports = router;