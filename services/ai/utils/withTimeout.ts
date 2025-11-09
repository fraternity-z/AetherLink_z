export function withTimeout<T>(p: Promise<T>, ms = 8000): Promise<T> {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(new Error('timeout')), ms);
  return new Promise((resolve, reject) => {
    p.then((v) => {
      clearTimeout(t);
      resolve(v);
    }).catch((e) => {
      clearTimeout(t);
      reject(e);
    });
  });
}

