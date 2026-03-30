var createError = require("http-errors");
var express = require("express");
var path = require("path");
var cookieParser = require("cookie-parser");
var logger = require("morgan");
let mongoose = require("mongoose");

var app = express();

// view engine setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// connect mongodb
mongoose.connect("mongodb://localhost:27017/NNPTUD-S2");

mongoose.connection.on("connected", function () {
  console.log("Da connect MongoDB");
});

mongoose.connection.on("error", function (err) {
  console.log("Loi connect MongoDB:", err.message);
});

// routes
// localhost:3000
app.use("/", require("./routes/index"));

// localhost:3000/users
app.use("/users", require("./routes/users"));
app.use("/roles", require("./routes/roles"));
app.use("/auth", require("./routes/auth"));
app.use("/carts", require("./routes/carts"));
app.use("/products", require("./routes/products"));
app.use("/upload", require("./routes/upload"));
app.use("/messages", require("./routes/messages")); // them route messages

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.send({
    message: err.message,
  });
});

module.exports = app;