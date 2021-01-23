const puppeteer = require("puppeteer");
const scrollPageToBottom = require("puppeteer-autoscroll-down");
const fs = require("fs");
const _ = require("lodash");
const appRoot = require("app-root-path");

const URL = "https://www.vinted.fr/";

const saveToFile = (file, content) => {
  fs.writeFile(`${appRoot}/data/${file}`, JSON.stringify(content), (err) => {
    if (err) {
      return console.log(err);
    } else {
      console.log(`content saved in ${file}`);
    }
  });
};

const scrapHomePage = async () => {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox"],
    headless: false,
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1600,
    height: 1600,
  });
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  /* await scrollPageToBottom(page); */
  await page.waitForSelector(".feed-grid__item");
  const products = await page.evaluate(() => {
    const elements = Array.from(document.querySelectorAll(".feed-grid__item"));
    return elements.map((element) => {
      const owner_name = element.querySelector(".c-box__owner .u-flexbox")
        ? element.querySelector(".c-box__owner .u-flexbox").innerText
        : null;
      const owner_avatar = element.querySelector(".c-box__owner img")
        ? element.querySelector(".c-box__owner img").getAttribute("src")
        : null;
      const owner_link = element.querySelector(".c-box__owner a")
        ? element.querySelector(".c-box__owner a").getAttribute("href")
        : null;
      const product_image = element.querySelector(".c-box__image img")
        ? element.querySelector(".c-box__image img").getAttribute("src")
        : null;
      const product_link = element.querySelector(".c-box__image a")
        ? `https://www.vinted.fr${element
            .querySelector(".c-box__image a")
            .getAttribute("href")}`
        : null;
      const product_price = element.querySelector(".c-box__title")
        ? Number(
            element
              .querySelector(".c-box__title")
              .innerText.replace(" €", "")
              .replace(",", ".")
          )
        : null;
      return {
        owner_name,
        owner_avatar,
        owner_link,
        product_image,
        product_link,
        product_price,
      };
    });
  });
  await browser.close();
  console.log("scrapHomePage finished");
  return products;
};

const scrapProduct = async (url) => {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox"],
    headless: false,
  });
  const page = await browser.newPage();
  await page.setViewport({
    width: 1600,
    height: 1600,
  });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".details-list--info");
  const product = await page.evaluate(() => {
    const product_name = document.querySelector(
      ".details-list--info div[itemprop='name']"
    )
      ? document.querySelector(".details-list--info div[itemprop='name']")
          .innerText
      : null;
    const product_description = document.querySelector(
      ".details-list--info .u-text-wrap"
    )
      ? document.querySelector(".details-list--info .u-text-wrap").innerText
      : null;
    const product_pictures = Array.from(
      document.querySelectorAll(".item-photo")
    ).map((element) => {
      return element.querySelector("a").getAttribute("href");
    });
    const product_details = Array.from(
      document.querySelectorAll(".details-list__item")
    )
      .map((element) => {
        return {
          [`${element.querySelector("div:first-child").innerText}`]:
            element.querySelector("div:first-child").innerText === "MARQUE"
              ? element
                  .querySelector("div:last-child")
                  .innerText.slice(
                    0,
                    element.querySelector("div:last-child").innerText.length - 8
                  )
              : element.querySelector("div:last-child").innerText,
        };
      })
      .splice(
        2,
        Array.from(document.querySelectorAll(".details-list__item")).length - 6
      );
    return {
      product_name,
      product_description,
      product_pictures,
      product_details,
    };
  });
  await browser.close();
  console.log("scrapProduct finished");
  return product;
};

const scrapOwner = async (url) => {
  // console.log({ url });
  if (url) {
    const browser = await puppeteer.launch({
      args: ["--no-sandbox"],
      headless: false,
    });
    const page = await browser.newPage();

    await page.setViewport({
      width: 1600,
      height: 1600,
    });

    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".profile__info");

    const owner = await page.evaluate(() => {
      const owner_image = document.querySelector(
        ".profile__info img:first-child"
      )
        ? document
            .querySelector(".profile__info img:first-child")
            .getAttribute("src") !== "/assets/no-photo/user-empty-state.svg"
          ? document
              .querySelector(".profile__info img:first-child")
              .getAttribute("src")
          : null
        : null;
      const owner_name = document.querySelector(
        ".profile__info .u-overflow-hidden:first-child .u-flexbox span:first-child"
      )
        ? document.querySelector(
            ".profile__info .u-overflow-hidden:first-child .u-flexbox span:first-child"
          ).innerText
        : null;
      const owner_rating = document.querySelectorAll(
        ".profile__info .c-rating__star--full"
      )
        ? Array.from(
            document.querySelectorAll(".profile__info .c-rating__star--full")
          ).length +
          (document.querySelector(".profile__info .c-rating__star--half-full")
            ? 0.5
            : 0)
        : null;
      return {
        owner_image,
        owner_name,
        owner_rating,
      };
    });
    await browser.close();
    console.log("scrapOwner finished");

    return owner;
  }
};

const goScrapp = async (req, res, next) => {
  try {
    if (req.headers.authorization) {
      const token = req.headers.authorization.replace("Bearer ", "");

      if (token !== process.env.ADMIN_TOKEN) {
        res.status(401).json({ error: "Unauthorized" });
      } else {
        const products = await scrapHomePage();

        // SCRAP PRODUCTS
        for (let i = 0; i < products.length; i++) {
          const { product_link } = products[i];
          const product = await scrapProduct(product_link);
          products[i] = { ...products[i], ...product };
          // console.log(products[i]);
        }
        saveToFile("products.json", products);
        // SCRAP OWNERS
        const owners = [];
        for (let i = 0; i < products.length; i++) {
          const { owner_link, owner_name } = products[i];
          if (!_.find(owners, { name: owner_name }) && owner_link) {
            const owner = await scrapOwner(owner_link);
            owners.push(owner);
            // console.log(owner);
          }
        }
        saveToFile("owners.json", owners);
        next();
      }
    } else {
      res.status(401).json({ error: "Unauthorized" });
    }
  } catch (error) {
    return res
      .status(400)
      .json({ error: "An error occured when scrapping ==> " + error.message });
  }
};

module.exports = goScrapp;
