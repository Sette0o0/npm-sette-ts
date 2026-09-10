# create-sette-ts

CLI para criar um projeto TypeScript novo com a estrutura deste repositório.

Opções disponíveis:

- `--no-install`: cria os arquivos sem instalar dependências;
- `--git`: executa `git init` no projeto criado;
- `--help`: exibe a ajuda.

## Publicação no npm

### Publicar

```powershell
npm publish
```

### Atualizar

```powershell
npm version patch

npm version minor

npm version major
```

## Uso

```powershell
npx create-sette-ts@latest meu-projeto
```

Ou, no formato `npm create`:

```powershell
npm create sette-ts@latest meu-projeto
```
