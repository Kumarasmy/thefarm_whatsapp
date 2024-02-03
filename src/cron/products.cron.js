const { calatog_products } = require("../models");
const { logger } = require("../utils");
const { axiosInstance } = require("../functions");
const { masterCatalogIds, accessToken } = require("../config/bot.config");

async function getCatalogProducts(catalogID) {
  try {
    const response = await axiosInstance.get(
      `/${catalogID}/products?limit=500&access_token=${accessToken}`
    );
    if (response.data) {
      return response.data;
    } else {
      logger.error(
        `Error getting catalog products: Response does not contain data`
      );
      return null;
    }
  } catch (error) {
    logger.error(`Error getting catalog products: ${error.message}`);
    return null;
  }
}

async function updateCatalogProducts() {
  try {
    for (const masterCatalogId of masterCatalogIds) {
      const products = await getCatalogProducts(masterCatalogId);
      if (products) {
        const catalogProducts = products.data.map((product) => {
          return {
            id: product.id, //primary key
            name: product.name,
            retailer_id: product.retailer_id,
            catalog_id: masterCatalogId,
          };
        });

        await calatog_products.bulkCreate(catalogProducts, {
          updateOnDuplicate: ["name", "retailer_id", "catalog_id"],
        });

      }
    }
    logger.info(`Catalog products updated : ${new Date().toISOString()}`);
  } catch (error) {
    logger.error(`Error updating catalog products: ${error.message}`);
  }
}

module.exports = {
  updateCatalogProducts,
};
