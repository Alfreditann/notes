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

function isAjaxRequest(req) {
  return req.get("X-Requested-With") === "fetch" || req.accepts(["json", "html"]) === "json";
}

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function renderIndex(res, req, errorMessage = null) {
  try {
    const { data } = await axios.get(`${BASE_URL}/data`, {
      headers: authHeaders(req)
    });

    return res.status(errorMessage ? 400 : 200).render("index", {
      data: data || { notes: [], todos: [] },
      username: req.session.username || "Unknown user",
      errorMessage
    });
  } catch {
    return res.status(errorMessage ? 400 : 200).render("index", {
      data: { notes: [], todos: [] },
      username: req.session.username || "Unknown user",
      errorMessage
    });
  }
}

function validationError(res, req, message) {
  if (isAjaxRequest(req)) {
    return res.status(400).json({ error: message });
  }

  return renderIndex(res, req, message);
}

function apiErrorMessage(error, fallbackMessage) {
  return error?.response?.data?.error || fallbackMessage;
}

function apiErrorStatus(error, fallbackStatus = 500) {
  return Number(error?.response?.status) || fallbackStatus;
}

function handleApiFailure(res, req, error, fallbackMessage) {
  const message = apiErrorMessage(error, fallbackMessage);
  const status = apiErrorStatus(error, 500);

  if (isAjaxRequest(req)) {
    return res.status(status).json({ error: message });
  }

  return renderIndex(res, req, message);
}

app.get("/login", (req, res) => {
  res.render("login", { error: null });
});

app.get("/register", (req, res) => {
  res.render("register", { error: null });
});

app.post("/login", async (req, res) => {
  const username = cleanText(req.body?.username);
  const password = cleanText(req.body?.password);

  if (!username || !password) {
    return res.status(400).render("login", { error: "Username and password are required." });
  }

  if (username.length < 3) {
    return res.status(400).render("login", { error: "Username must be at least 3 characters." });
  }

  try {
    const { data } = await axios.post(`${BASE_URL}/login`, {
      username,
      password
    });

    req.session.user_id = data.user_id;
    req.session.username = username;
    res.redirect("/");
  } catch (error) {
    const apiMessage = error?.response?.data?.error;
    const message = apiMessage || "Username does not exist or password is wrong.";
    res.status(401).render("login", { error: message });
  }
});

app.post("/register", async (req, res) => {
  const username = cleanText(req.body?.username);
  const password = cleanText(req.body?.password);

  if (!username || !password) {
    return res.status(400).render("register", { error: "Username and password are required." });
  }

  if (username.length < 3) {
    return res.status(400).render("register", { error: "Username must be at least 3 characters." });
  }

  if (password.length < 6) {
    return res.status(400).render("register", { error: "Password must be at least 6 characters." });
  }

  try {
    await axios.post(`${BASE_URL}/register`, {
      username,
      password
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
  return renderIndex(res, req);
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
  const title = cleanText(req.body?.title);
  const content = cleanText(req.body?.content);

  if (!title || !content) {
    return validationError(res, req, "Title and content are required.");
  }

  if (title.length > 120) {
    return validationError(res, req, "Note title must be 120 characters or fewer.");
  }

  if (content.length > 1000) {
    return validationError(res, req, "Note content must be 1000 characters or fewer.");
  }

  try {
    await axios.post(
      `${BASE_URL}/notes`,
      { title, content },
      { headers: authHeaders(req) }
    );
    return res.redirect("/");
  } catch (error) {
    return handleApiFailure(res, req, error, "Could not create note. Try again.");
  }
});

app.post("/notes/edit/:id", requireLogin, async (req, res) => {
  const title = cleanText(req.body?.title);
  const content = cleanText(req.body?.content);

  if (!title || !content) {
    return validationError(res, req, "Title and content are required.");
  }

  if (title.length > 120) {
    return validationError(res, req, "Note title must be 120 characters or fewer.");
  }

  if (content.length > 1000) {
    return validationError(res, req, "Note content must be 1000 characters or fewer.");
  }

  try {
    await axios.patch(
      `${BASE_URL}/notes/${req.params.id}`,
      {
        title,
        content
      },
      { headers: authHeaders(req) }
    );
    return res.redirect("/");
  } catch (error) {
    return handleApiFailure(res, req, error, "Could not update note. Try again.");
  }
});

app.post("/notes/delete/:id", requireLogin, async (req, res) => {
  try {
    await axios.delete(`${BASE_URL}/notes/${req.params.id}`, {
      headers: authHeaders(req)
    });
    return res.redirect("/");
  } catch (error) {
    return handleApiFailure(res, req, error, "Could not delete note. Try again.");
  }
});

app.post("/todos", requireLogin, async (req, res) => {
  const title = cleanText(req.body?.title);
  const tasksInput = cleanText(req.body?.tasks);

  if (!title || !tasksInput) {
    return validationError(res, req, "Title and tasks are required.");
  }

  if (title.length > 120) {
    return validationError(res, req, "Todo title must be 120 characters or fewer.");
  }

  const tasks = tasksInput
    .split(",")
    .map((t) => ({ text: t.trim(), completed: false }))
    .filter((task) => task.text.length > 0);

  if (!tasks.length) {
    return validationError(res, req, "Add at least one task.");
  }

  if (tasks.some((task) => task.text.length > 120)) {
    return validationError(res, req, "Each task must be 120 characters or fewer.");
  }

  try {
    await axios.post(
      `${BASE_URL}/todos`,
      { title, tasks },
      { headers: authHeaders(req) }
    );
    return res.redirect("/");
  } catch (error) {
    return handleApiFailure(res, req, error, "Could not create todo list. Try again.");
  }
});

app.post("/tasks/toggle/:id", requireLogin, async (req, res) => {
  try {
    await axios.patch(
      `${BASE_URL}/tasks/${req.params.id}`,
      { toggle: true },
      { headers: authHeaders(req) }
    );
    return res.redirect("/");
  } catch (error) {
    return handleApiFailure(res, req, error, "Could not update task. Try again.");
  }
});

app.post("/todos/delete/:id", requireLogin, async (req, res) => {
  try {
    await axios.delete(`${BASE_URL}/todos/${req.params.id}`, {
      headers: authHeaders(req)
    });
    return res.redirect("/");
  } catch (error) {
    return handleApiFailure(res, req, error, "Could not delete todo list. Try again.");
  }
});

app.post("/tasks/delete/:id", requireLogin, async (req, res) => {
  try {
    await axios.delete(`${BASE_URL}/tasks/${req.params.id}`, {
      headers: authHeaders(req)
    });
    return res.redirect("/");
  } catch (error) {
    return handleApiFailure(res, req, error, "Could not delete task. Try again.");
  }
});

app.listen(FRONTEND_PORT, "0.0.0.0", () => {
  console.log(`Frontend running on http://localhost:${FRONTEND_PORT}`);
});