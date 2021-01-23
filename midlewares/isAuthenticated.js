const User = require("../models/User");

const isAuthenticated = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      //Je test si un user correspond au token
      //Je récupère le bearer token de la requête, sans "Bearer "
      const token = req.headers.authorization.replace("Bearer ", "");
      //Je récupère les clefs du user visé par le token (+ l'id automatiquement)
      const user = await User.findOne({ token: token }).select(
        "account email token"
      );
      if (user) {
        //J'ajoute une clef à req et y stocke mon user
        req.user = user;
        //Je sors du midlleware pour passer à la suite
        return next();
      } else {
        return res.status(401).json({ message: "Unauthorizer" });
      }
    } else {
      return res.status(401).json({ message: "Unauthorizer" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = isAuthenticated;
