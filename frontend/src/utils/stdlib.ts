export function prop(key: string) {
  return function (obj: any) {
    return obj[key];
  };
}

export function indexBy<T, S extends keyof T>(key: S, list: T[]) {
  return new Map(list.map((item) => [item[key], item]));
}

export function memoizeByKey<R, K>(
  keyGenerator: (...args: any[]) => K,
  fn: (...args: any[]) => R,
) {
  const cache = new Map<K, R>();

  return function (...args: any[]) {
    const key = keyGenerator(...args);

    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = fn.apply(null, args); // Execute the original function if not cached
    cache.set(key, result); // Store the result in the cache
    return result;
  };
}

export function takeWhile<T>(list: T[], check: (t: T) => boolean) {
  let result: T[] = [];
  for (const item of list) {
    if (check(item) === false) {
      break;
    }
    result.push(item);
  }
  return result;
}
