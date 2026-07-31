function generateAccountNumber() {
  const stamp = Date.now().toString().slice(-8);
  const random = Math.floor(1000 + Math.random() * 9000);
  return `MB${stamp}${random}`;
}

function generateReference(prefix) {
  const stamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${stamp}-${random}`;
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

module.exports = {
  generateAccountNumber,
  generateReference,
  roundMoney
};
