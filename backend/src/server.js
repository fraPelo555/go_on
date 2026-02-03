const app = require("./app.js");
const { connectToMongo } = require("./db");

const PORT = process.env.PORT || 3000;

async function startServer() {
  await connectToMongo();
  app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
  });
}

startServer();