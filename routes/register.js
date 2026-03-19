const express = require("express");
const app = express();
const router = express.Router()

app.set("view engine", "ejs");

app.use(express.static("public"))

router.get("/", (req, res) => {
    res.render('register.ejs');

})

module.exports = router;