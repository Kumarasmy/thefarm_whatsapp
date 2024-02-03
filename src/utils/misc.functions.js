const moment = require("moment");
exports.manipulateDate = (date) => {
  const today = moment();
  const yesterday = moment().subtract(1, "days");
  const dateMoment = moment(date);
  if (today.isSame(dateMoment, "day")) {
    return "Today";
  } else if (yesterday.isSame(dateMoment, "day")) {
    return "Yesterday";
  }
  return dateMoment.fromNow();
};
