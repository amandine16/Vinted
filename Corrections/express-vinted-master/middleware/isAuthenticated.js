const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  // req.headers.authorization
  if (req.headers.authorization) {
    // console.log(req.headers.authorization);
    const token = req.headers.authorization.replace("Bearer ", "");
    // Chercher dans la BDD un user qui a ce token
    const user = await User.findOne({ token: token }).select("account _id");
    // console.log(user);
    if (user) {
      req.user = user;
      next();
    } else {
      return res.status(401).json({
        message: "Unauthorized",
      });
    }
  } else {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }
};

module.exports = isAuthenticated;
