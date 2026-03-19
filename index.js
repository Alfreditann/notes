const express = require("express");
const app = express();

const registerRoute = require(`./routes/register`)

app.use(`/register`, registerRoute)

app.set("view engine", "ejs");

app.use(express.static("public"))

app.get("/", (req, res) => {
    res.render("index", {
        result: null
    });
});

app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});