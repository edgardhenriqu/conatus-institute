module.exports = (req, res) => {
  const { email, password } = req.body;

  if (email === "admin@dc.com" && password === "123456") {
    res.status(200).json({ success: true, user: { email: "admin@dc.com" } });
  } else {
    res.status(401).json({ success: false });
  }
};