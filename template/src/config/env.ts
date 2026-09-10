import "dotenv/config";

function required(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Variável de ambiente ${name} é obrigatória`);
  }

  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
};