const express = require("express");
const formidable = require("express-formidable");
const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
// Permet d'activer les variables d'environnement qui se trouvent dans le fichier `.env`
require("dotenv").config();
//Le Cross-origin resource sharing est une sécurité activée par défaut qui permet à un serveur d'empêcher d'autres sites d'utiliser ses ressources (images, routes d'une API, etc.).
//Le module cors permet d'autoriser ou non les demandes provenant de l'extérieur.
const cors = require("cors");

const app = express();
app.use(formidable());
app.use(cors());

//Initialisation de la bdd avec nom Vintedh
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useCreateIndex: true,
});

//Importation des routes
const userRoutes = require("./routes/user");
app.use(userRoutes);
const offerRoutes = require("./routes/offer");
app.use(offerRoutes);

//Configuration Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,

  api_key: process.env.CLOUDINARY_API_KEY,

  api_secret: process.env.CLOUDINARY_API_SECRET,
});
//Gestion des erreurs
app.all("*", (req, res) => {
  res.status(404).json({ error: "Route don't exist" });
});
//Ecoute du serveur
app.listen(process.env.PORT, () => {
  console.log("Server started");
});
