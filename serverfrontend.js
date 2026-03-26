const express = require("express");
const path = require("path");
const axios = require("axios");

const app = express();
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const API_KEY = "hemmelig123";
const BASE_URL = "http://192.168.20.35:5000/api";

app.get("/", async (req, res) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/data`, {
      headers: { "x-api-key": API_KEY },
    });
    res.render("index", { data: data || { notes: [], todos: [] } });
  } catch {
    res.render("index", { data: { notes: [], todos: [] } });
  }
});

app.post("/notes", async (req, res) => {
  await axios.post(
    `${BASE_URL}/notes`,
    { title: req.body.title, content: req.body.content },
    { headers: { "x-api-key": API_KEY } },
  );
  res.redirect("/");
});

app.post("/notes/edit/:id", async (req, res) => {
  await axios.patch(
    `${BASE_URL}/notes/${req.params.id}`,
    { title: req.body.title || "", content: req.body.content || "" },
    { headers: { "x-api-key": API_KEY } },
  );
  res.redirect("/");
});

app.post("/notes/delete/:id", async (req, res) => {
  await axios.delete(`${BASE_URL}/notes/${req.params.id}`, {
    headers: { "x-api-key": API_KEY },
  });
  res.redirect("/");
});

app.post("/todos", async (req, res) => {
  const tasks = req.body.tasks
    .split(",")
    .map((t) => ({ text: t.trim(), completed: false }));
  await axios.post(
    `${BASE_URL}/todos`,
    { title: req.body.title, tasks },
    { headers: { "x-api-key": API_KEY } },
  );
  res.redirect("/");
});

app.post("/tasks/toggle/:id", async (req, res) => {
  await axios.patch(
    `${BASE_URL}/tasks/${req.params.id}`,
    { toggle: true },
    { headers: { "x-api-key": API_KEY } },
  );
  res.redirect("/");
});

app.post("/todos/delete/:id", async (req, res) => {
  await axios.delete(`${BASE_URL}/todos/${req.params.id}`, {
    headers: { "x-api-key": API_KEY },
  });
  res.redirect("/");
});

app.listen(3000,'0.0.0.0', () =>
  console.log("Frontend running on http://localhost:3000"),
);
