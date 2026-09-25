export const memory = {
  users: [],
  carts: new Map(),
  orders: [],
}

export function id(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}
