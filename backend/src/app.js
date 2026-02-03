const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { connectToMongo } = require("./db");
const trailRouter = require("./routes/Trail");
const reportRouter = require("./routes/Report");
const feedbacksRouter = require("./routes/Feedback");
const usersRouter = require("./routes/User");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Server Funzionante')
})

app.use("/trails", trailRouter);
app.use("/reports", reportRouter);
app.use("/feedbacks", feedbacksRouter);
app.use("/users", usersRouter);

connectToMongo();

module.exports = app;