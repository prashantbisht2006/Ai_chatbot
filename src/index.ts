import express from "express";

const app = express();

app.use(express.json());

app.post("/", (req, res) => {
  res.json({
    message: "POST / route is working",
    body: req.body
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
