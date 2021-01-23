const express = require("express");
const router = express.Router();
//model pour tester si le token correspond à un user de ma bdd
const User = require("../models/User");
//model pour créer ma nouvelle offre
const Offer = require("../models/Offer");
//Cloudinary pour stocker l'image
const cloudinary = require("cloudinary").v2;
//J'importe la fonction isAuthenticated dont j'ai besoin
const isAuthenticated = require("../midlewares/isAuthenticated");

router.post("/offer/publish", isAuthenticated, async (req, res) => {
  try {
    //Je stocke les infos de mon user
    const user = req.user;
    console.log("publish");
    //Destructuring
    const {
      title,
      description,
      price,
      size,
      brand,
      condition,
      city,
      color,
    } = req.fields;
    // Créer une nouvelle annonce sans les infos de l'image
    const newOffer = new Offer({
      product_name: title,
      product_description: description,
      product_price: price,
      product_details: [
        {
          MARQUE: brand,
        },
        {
          TAILLE: size,
        },
        {
          ÉTAT: condition,
        },
        {
          COULEUR: color,
        },
        {
          EMPLACEMENT: city,
        },
      ],
      // Pour faire une réf je peux soit envoyer l'id, soit envoyer le document complet
      owner: user,
    });
    //Avant de sauvergarder l'annonce, j'envoie mon image et crée le dossier nommé par l'id de l'offre
    const pictureToUpload = req.files.picture.path;
    const result = await cloudinary.uploader.upload(pictureToUpload, {
      folder: `/vinted/offers/${newOffer._id}`,
    });
    //Une fois l'image sauvergardée, j'ajoute les infos de l'image dans la clef product_image de ma bdd
    newOffer.product_image = result;
    //Je sauvegarde enfin mon offre complète
    await newOffer.save();
    //J'envoie ma réponse
    res.status(200).json(newOffer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// router.post("/offer/publish", isAuthenticated, async (req, res) => {
//   // route qui permet de poster une nouvelle annonce
//   try {
//     // Création de la nouvelle annonce (sans l'image)
//     const newOffer = new Offer({
//       product_name: req.fields.title,
//       product_description: req.fields.description,
//       product_price: req.fields.price,
//       product_details: [
//         { MARQUE: req.fields.brand },
//         { TAILLE: req.fields.size },
//         { ÉTAT: req.fields.condition },
//         { COULEUR: req.fields.color },
//         { EMPLACEMENT: req.fields.city },
//       ],
//       owner: req.user,
//     });

//     // Envoi de l'image à cloudinary
//     const result = await cloudinary.uploader.unsigned_upload(
//       req.files.picture.path,
//       "vinted_upload",
//       {
//         folder: `api/vinted/offers/${newOffer._id}`,
//         public_id: "preview",
//         cloud_name: "lereacteur",
//       }
//     );

//     // ajout de l'image dans newOffer
//     newOffer.product_image = result;

//     await newOffer.save();

//     res.json(newOffer);
//   } catch (error) {
//     console.log(error.message);
//     res.status(400).json({ message: error.message });
//   }
// });

router.put("/offer/update/:id", isAuthenticated, async (req, res) => {
  const offerToModify = await Offer.findById(req.params.id);
  try {
    if (req.fields.title) {
      offerToModify.product_name = req.fields.title;
    }
    if (req.fields.description) {
      offerToModify.product_description = req.fields.description;
    }
    if (req.fields.price) {
      offerToModify.product_price = req.fields.price;
    }

    const details = offerToModify.product_details;
    for (i = 0; i < details.length; i++) {
      if (details[i].MARQUE) {
        if (req.fields.brand) {
          details[i].MARQUE = req.fields.brand;
        }
      }
      if (details[i].TAILLE) {
        if (req.fields.size) {
          details[i].TAILLE = req.fields.size;
        }
      }
      if (details[i].ÉTAT) {
        if (req.fields.condition) {
          details[i].ÉTAT = req.fields.condition;
        }
      }
      if (details[i].COULEUR) {
        if (req.fields.color) {
          details[i].COULEUR = req.fields.color;
        }
      }
      if (details[i].EMPLACEMENT) {
        if (req.fields.location) {
          details[i].EMPLACEMENT = req.fields.location;
        }
      }
    }

    // Notifie Mongoose que l'on a modifié le tableau product_details
    offerToModify.markModified("product_details");

    if (req.files.picture) {
      const result = await cloudinary.uploader.upload(req.files.picture.path, {
        public_id: `api/vinted/offers/${offerToModify._id}/preview`,
      });
      offerToModify.product_image = result;
    }

    await offerToModify.save();

    res.status(200).json("Offer modified succesfully !");
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ error: error.message });
  }
});

router.get("/offers", async (req, res) => {
  try {
    // création d'un objet dans lequel on va sotcker nos différents filtres
    let filters = {};

    if (req.query.title) {
      filters.product_name = new RegExp(req.query.title, "i");
    }
    //Si un prix min existe, j'ajoute une propriété nommée product_price à filters
    if (req.query.priceMin) {
      filters.product_price = {
        $gte: req.query.priceMin,
      };
    }
    //Si pricMax existe, et que la propriété product_price existe aussi(donc qu'il a deja un prix min), alors j'ajoute mon filtre, sur la propriété product_price directement
    if (req.query.priceMax) {
      if (filters.product_price) {
        filters.product_price.$lte = req.query.priceMax;
      } else {
        //Sinon j'ajoute la propriété product_price directement
        filters.product_price = {
          $lte: req.query.priceMax,
        };
      }
    }

    let sort = {};

    if (req.query.sort === "price-desc") {
      sort = { product_price: -1 };
    } else if (req.query.sort === "price-asc") {
      sort = { product_price: 1 };
    }

    let page;
    //Si la query.page n'existe pas, ça retournera une valeur inférieur à 1, donc je mets par défaut page à 1
    if (Number(req.query.page) < 1) {
      page = 1;
    } else {
      //Sinon je récupère la vrai valeur de page
      page = Number(req.query.page);
    }
    //Si limite n'existe pas
    let limit;
    if (limit) {
      limit = Number(req.query.limit);
    } else {
      limit = 5;
    }
    console.log(limit);

    const offers = await Offer.find(filters)
      .populate({
        path: "owner",
        select: "account",
      })
      .sort(sort)
      .skip((page - 1) * limit) // ignorer les x résultats
      .limit(limit); // renvoyer y résultats

    // cette ligne va nous retourner le nombre d'annonces trouvées en fonction des filtres
    const count = await Offer.countDocuments(filters);

    res.json({
      count: count,
      offers: offers,
    });
  } catch (error) {
    console.log(error.message);
    res.status(400).json({ message: error.message });
  }
});

router.get("/offer/:id", async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);
    res.status(200).json(offer);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete("/offer/delete/:id", isAuthenticated, async (req, res) => {
  try {
    //Je supprime ce qu'il y a dans le dossier
    await cloudinary.api.delete_resources_by_prefix(
      `vinted/offers${req.params.id}`
    );
    //Une fois le dossier vide, je peux le supprimer
    await cloudinary.api.delete_folder(`vinted/offers/${req.params.id}`);

    offerToDelete = await Offer.findById(req.params.id);

    await offerToDelete.delete();
    res.status(200).json("Offer deleted successfully !");
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

//MA VERSION UPDATE
// router.put("/offer/update", isAuthenticated, async (req, res) => {
//   try {
//     //Je récupère mon user
//     const user = req.user;

//       //Je récupère mon offre
//       const offerToModify = await Offer.findById(req.query.id);
//       //Je stocke les clefs reçues en requête
//       const arrayOfKeys = await Object.keys(req.fields);
//       //Tableau qui parcours les keys reçu, et modifie les valeurs dans la bdd
//       arrayOfKeys.forEach((key) => {
//         console.log(req.fields[key]);
//         switch (key) {
//           case "title":
//             offerToModify.product_name = req.fields[key];
//             break;
//           case "description":
//             offerToModify.product_description = req.fields[key];
//             break;
//           case "price":
//             offerToModify.product_price = req.fields[key];
//             break;
//           case "condition":
//             offerToModify.product_details[2].ÉTAT = req.fields[key];
//             break;
//           case "city":
//             offerToModify.product_details[4].EMPLACEMENT = req.fields[key];
//             break;
//           case "brand":
//             offerToModify.product_details[0].MARQUE = req.fields[key];
//             break;
//           case "size":
//             offerToModify.product_details[1].TAILLE = req.fields[key];
//             break;
//           case "color":
//             offerToModify.product_details[3].COULEUR = req.fields[key];
//             break;

//           default:
//             break;
//         }
//       });
//       // Notifie Mongoose que l'on a modifié le tableau product_details
//       offerToModify.markModified("product_details");
//       //Si on modifie l'image
//       if (req.files.picture) {
//         const result = await cloudinary.uploader.upload(
//           req.files.picture.path,
//           {
//             public_id: `vinted/offerToModifys/${offerToModify._id}`,
//           }
//         );
//         offerToModify.product_image = result;
//       }
//       await offerToModify.save();
//       res.status(200).json("Offer modified successfully !");
//   } catch (error) {
//     res.status(404).json({ error: error.message });
//   }
// });

module.exports = router;
