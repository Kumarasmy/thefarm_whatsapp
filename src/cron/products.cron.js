const { calatog_products } = require("../models");
const { logger } = require("../utils");
const { axiosInstance } = require("../functions");
const { masterCatalogId, accessToken } = require("../config/bot.config");

async function getCatalogProducts() {
  try {
    const response = await axiosInstance.get(
      `/${masterCatalogId}/products?limit=100&access_token=${accessToken}`
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
    const products = await getCatalogProducts();
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

      logger.info(`Catalog products updated`);
    }
  } catch (error) {
    logger.error(`Error updating catalog products: ${error.message}`);
  }
}


module.exports = {
  updateCatalogProducts,
};