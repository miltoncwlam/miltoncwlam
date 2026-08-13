export function shuffleIds(
  values: string[],
  random: () => number = Math.random,
): string[] {
  return shuffleList(values, random);
}

export function shuffleList<T>(
  values: T[],
  random: () => number = Math.random,
): T[] {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }

  return result;
}
