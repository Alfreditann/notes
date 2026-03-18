const express = require("express");
const app = express();

const {initDB} = require ("./middleware/cdb")

app.set("view engine", "ejs");

app.use(express.static("public"))

app.get("/", (req, res) => {
    res.render("index", {
        result: null
    });
});

initDB()


app.listen(3000, () => {
    console.log("Server is running on http://localhost:3000");
});