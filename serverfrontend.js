const express = require("express");
const path = require("path");
const axios = require("axios");
const session = require("express-session");
require("dotenv").config();

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const SESSION_SECRET = process.env.SESSION_SECRET;
const API_KEY = process.env.API_KEY;
const BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:5000/api";
const FRONTEND_PORT = Number(process.env.FRONTEND_PORT || 3000);

if (!SESSION_SECRET || !API_KEY) {
  throw new Error("Missing required env vars: SESSION_SECRET and API_KEY");
}

app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: true
}));

function authHeaders(req) {
  return {
    "x-api-key": API_KEY,
    "user-id": req.session.user_id
  };
}

function requireLogin(req, res, next) {
  if (!req.session.user_id) return res.redirect("/login");
  next();
}

app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.get("/register", (req, res) => {
  res.render("register", { error: null });
});

app.post("/login", async (req, res) => {
  try {
    const { data } = await axios.post(`${BASE_URL}/login`, {
      username: req.body.username,
      password: req.body.password
    });

    req.session.user_id = data.user_id;
    req.session.username = req.body.username;
    res.redirect("/");
  } catch (error) {
    const apiMessage = error?.response?.data?.error;
    const message = apiMessage || "Username does not exist or password is wrong.";
    res.status(401).render("login", { error: message });
  }
});

app.post("/register", async (req, res) => {
  try {
    await axios.post(`${BASE_URL}/register`, {
      username: req.body.username,
      password: req.body.password
    });

    res.redirect("/login");
  } catch (error) {
    const apiMessage = error?.response?.data?.error;
    const message = apiMessage || "Could not register user. Try another username.";
    res.status(400).render("register", { error: message });
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/login");
  });
});

app.get("/", requireLogin, async (req, res) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/data`, {
      headers: authHeaders(req)
    });

    res.render("index", {
      data: data || { notes: [], todos: [] },
      username: req.session.username || "Unknown user"
    });
  } catch {
    res.render("index", {
      data: { notes: [], todos: [] },
      username: req.session.username || "Unknown user"
    });
  }
});

app.get("/snapshot", requireLogin, async (req, res) => {
  try {
    const { data } = await axios.get(`${BASE_URL}/data`, {
      headers: authHeaders(req)
    });

    res.json({
      data: data || { notes: [], todos: [] },
      username: req.session.username || "Unknown user"
    });
  } catch {
    res.json({
      data: { notes: [], todos: [] },
      username: req.session.username || "Unknown user"
    });
  }
});

app.post("/notes", requireLogin, async (req, res) => {
  await axios.post(
    `${BASE_URL}/notes`,
    { title: req.body.title, content: req.body.content },
    { headers: authHeaders(req) }
  );
  res.redirect("/");
});

app.post("/notes/edit/:id", requireLogin, async (req, res) => {
  await axios.patch(
    `${BASE_URL}/notes/${req.params.id}`,
    {
      title: req.body.title || "",
      content: req.body.content || ""
    },
    { headers: authHeaders(req) }
  );
  res.redirect("/");
});

app.post("/notes/delete/:id", requireLogin, async (req, res) => {
  await axios.delete(`${BASE_URL}/notes/${req.params.id}`, {
    headers: authHeaders(req)
  });
  res.redirect("/");
});

app.post("/todos", requireLogin, async (req, res) => {
  const tasks = req.body.tasks
    .split(",")
    .map((t) => ({ text: t.trim(), completed: false }));

  await axios.post(
    `${BASE_URL}/todos`,
    { title: req.body.title, tasks },
    { headers: authHeaders(req) }
  );
  res.redirect("/");
});

app.post("/tasks/toggle/:id", requireLogin, async (req, res) => {
  await axios.patch(
    `${BASE_URL}/tasks/${req.params.id}`,
    { toggle: true },
    { headers: authHeaders(req) }
  );
  res.redirect("/");
});

app.post("/todos/delete/:id", requireLogin, async (req, res) => {
  await axios.delete(`${BASE_URL}/todos/${req.params.id}`, {
    headers: authHeaders(req)
  });
  res.redirect("/");
});

app.listen(FRONTEND_PORT, "0.0.0.0", () => {
  console.log(`Frontend running on http://localhost:${FRONTEND_PORT}`);
});