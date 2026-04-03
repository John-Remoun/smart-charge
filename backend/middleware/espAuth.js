/**
 * Per-node tokens in .env:
 * station (single board, two doors) -> ESP_STATION_TOKEN
 * phone / powerbank (split boards) -> ESP_TOKEN_PHONE / ESP_TOKEN_POWERBANK
 */
exports.espNodeAuth = (req, res, next) => {
  const slug = req.params.slug;
  if (!['phone', 'powerbank', 'station'].includes(slug)) {
    return res.status(400).json({ message: 'Invalid slug' });
  }
  const token = req.headers['x-esp-token'] || req.body?.token || req.query?.token;
  const expected =
    slug === 'station'
      ? process.env.ESP_STATION_TOKEN || 'dev-token-station'
      : slug === 'phone'
        ? process.env.ESP_TOKEN_PHONE || 'dev-token-phone'
        : process.env.ESP_TOKEN_POWERBANK || 'dev-token-powerbank';
  if (!token || token !== expected) {
    return res.status(401).json({ message: 'Invalid or missing X-Esp-Token' });
  }
  next();
};
