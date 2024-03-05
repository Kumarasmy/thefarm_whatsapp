module.exports = {
  phoneNumberID: "236228429565370",
  WABAID: "193375730533636",
  apiVersion: "v18.0",
  accessToken: "",
  prefix: "!",
  serviceable_pincodes: ["6000119", "600053"],
  admins: ["918428719833"],
  masterCatalogIds: ["730957122326676"],
  isMaintainanceMode: false, //bot will not respond to any messages if this is true
  serviceable_pincodes_descriptions: [
    {
      pincode: "",
      pincodeName: "",
      isPincodeCoveredFully: true,
      CoveredAreas: [""], //if isPincodeCoveredFully is false, then this array should contain all the areas in the pincode
    },
  ],
  payment: {
    cashfree_config: {
      prod: {
        clientId: "",
        clientSecret: "",
        baseUrl: "https://api.cashfree.com/pg",
        version: "2023-08-01", //v4
      },
      test: {
        clientId: "268995875c7a6befb2f078ceb6599862",
        clientSecret: "fe271df7130cafb8d9942d303a2957f7ac53f90d",
        baseUrl: "https://sandbox.cashfree.com/pg",
        version: "2023-08-01", //v4
      },
    },
    enable_live_payment: false, //if true, then the bot will use the prod credentials for cashfree
    available_methods: {
      online: true,
      cod: true,
    },
    facebook_payment_config : "razor_pay2"
  },
};

//https://web.farm-kart.in/whatsapp/webhook
