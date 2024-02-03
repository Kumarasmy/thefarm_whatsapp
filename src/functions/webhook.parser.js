function parseWebhook(body) {
  let response = {
    phoneNumberId: null,
    from: null,
    wa_id: null,
    name: null,
    msg_body: null,
    isLocation: false,
    location: null,
    isButton: false,
    buttonResponse: null,
    buttonType: null,
    type: null,
    error: false,
    errorMessage: null,
    notSupported: false,
    messageDeleted: false,
    timestamp: null,
    messageId: null,
    order: null,
  };

  try {
    if (body.object) {
      if (
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const contact = body.entry[0].changes[0].value.contacts[0];

        response.name = contact.profile?.name;
        response.wa_id = contact.wa_id;
        const type = message.type;
        response.timestamp = message.timestamp;
        response.type = type;
        response.messageId = message.id;

        response.phoneNumberId =
          body.entry[0].changes[0].value.metadata.phone_number_id;
        response.from = message.from;

        switch (type) {
          case "text":
            response.msg_body = message.text.body;
            break;
          case "location":
            response.location = message.location;
            break;
          case "unknown":
            response.notSupported = true;
            break;
          case "unsupported":
            response.messageDeleted = true;
            break;
          case "request_welcome":
            break;
          case "order":
            response.order = message.order;
            break;
          case "button":
            response.buttonType = "button";
            response.isButton = true;
            response.buttonResponse = message.button;
            break;
          case "interactive":
            manageInteractive(response, message);
            break;

          default:
            response.notSupported = true;
            break;
        }

        //if message has errors array and it is not empty
        if (message.errors && message.errors.length > 0) {
          response.error = true;
          response.errorMessage = message.errors[0].message;
          logger.error(
            `Error from WhatsApp: ${JSON.stringify(message.errors)}`
          );
        }
      }
    }
    return response;
  } catch (error) {
    response.error = true;
    response.errorMessage = error.message;
    console.log(`Error parsing webhook: ${error.message}`);
  }
}

function manageInteractive(response, message) {
  const interactive = message.interactive;

  if (interactive) {
    if (interactive.type === "button_reply" && interactive.button_reply) {
      return setInteractiveProperties(
        response,
        "button_reply",
        interactive.button_reply
      );
    } else if (interactive.type === "nfm_reply" && interactive.nfm_reply) {
      return setInteractiveProperties(
        response,
        "nfm_reply",
        interactive.nfm_reply
      );
    }
  }
}

function setInteractiveProperties(response, buttonType, buttonResponse) {
  response.buttonType = buttonType;
  response.isButton = true;
  response.buttonResponse = buttonResponse;
}

module.exports = {
  parseWebhook,
};
