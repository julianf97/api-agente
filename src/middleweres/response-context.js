export function responseContext(context) {
  return (_req, res, next) => {
    const json = res.json.bind(res);
    res.json = (body) => json({ ...body, context });
    next();
  };
}
