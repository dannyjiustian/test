/**
 * English: functions that will be used in the server
 * Indonesian: fungsi-fungsi yang akan digunakan di server
 */
const sendResponse = (status, message, response = []) => {
  const payload = {
    status: status,
    message: message,
  };
  if (
    Object.keys(response).length > 0 ||
    (typeof response !== "undefined" && response.length > 0)
  )
    payload.data = response;
  return payload;
};

const responseServer400 = (res, msg) =>
  res.status(400).json(sendResponse(false, msg));

const responseServer404 = (res, msg) =>
  res.status(404).json(sendResponse(false, msg));

const responseServer200 = (res, msg, data = "") =>
  res.status(200).json(sendResponse(true, msg, data));

const responseServer500 = (res, msg, data = "") =>
  res.status(500).json(sendResponse(false, msg, data));

export {
  responseServer400,
  responseServer200,
  responseServer404,
  responseServer500,
};
