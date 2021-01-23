const express = require("express");
const router = express.Router();
//Package pour Cryptage password
const uid2 = require("uid2");
const SHA256 = require("crypto-js/sha256");
const encBase64 = require("crypto-js/enc-base64");
//Importation des models
const User = require("../models/User");

//Création d'un compte user
router.post("/user/signup/", async (req, res) => {
  try {
    //Test si je reçois toutes les infos dont j'ai besoin
    if (req.fields.email && req.fields.username && req.fields.password) {
      //Cryptage du password
      //Générer un salt
      const salt = uid2(64);
      //Générer un hash
      const hash = SHA256(req.fields.password + salt).toString(encBase64);
      //Génrer un token
      const token = uid2(64);
      //Test si l'email existe déjà
      const user = await User.find({ email: req.fields.email });
      if (user.length <= 0) {
        //Si pas de mail déjà présent => Création d'un nouveau user
        const newUser = new User({
          email: req.fields.email,
          account: {
            username: req.fields.username,
            phone: req.fields.phone,
          },
          token: token,
          hash: hash,
          salt: salt,
        });
        //Sauvegarde
        await newUser.save();
        //Réponse
        res.status(200).json({
          _id: newUser._id,
          token: newUser.token,
          account: {
            username: newUser.account.username,
            phone: newUser.account.phone,
          },
        });
      } else {
        res.status(400).json({
          message: "Email already exists",
        });
      }
    } else {
      res.status(400).json({
        message: "Missing parameters",
      });
    }
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

router.post("/user/login/", async (req, res) => {
  try {
    //Récupérer les infos du user via l'email
    const user = await User.findOne({ email: req.fields.email });
    if (user) {
      //Récupérer le password
      const password = req.fields.password;
      //Générer un newHash
      const newHash = SHA256(password + user.salt).toString(encBase64);
      //Comparer le newHash au hash de la bdd
      if (newHash === user.hash) {
        res.status(200).json({
          _id: user._id,
          token: user.token,
          account: {
            username: user.account.username,
            phone: user.account.phone,
          },
        });
      } else {
        res.status(401).json({ message: "Unauthorized" });
      }
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
