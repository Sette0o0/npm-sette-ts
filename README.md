# create-sette-ts

CLI para criar um projeto TypeScript novo com a estrutura deste repositório.

## Uso local

Enquanto estiver desenvolvendo o gerador, execute na raiz deste repositório:

```powershell
node .\bin\create-sette-ts.js meu-projeto
```

Para testar o pacote exatamente como ele será distribuído:

```powershell
npm pack
npx .\create-sette-ts-1.0.0.tgz meu-projeto
```

O instalador cria a pasta, troca o nome no `package.json`, instala as dependências e mostra os próximos comandos.

Opções disponíveis:

- `--no-install`: cria os arquivos sem instalar dependências;
- `--git`: executa `git init` no projeto criado;
- `--help`: exibe a ajuda.

## Publicação no npm

Antes da primeira publicação, confirme se o nome `create-sette-ts` está disponível. Depois, autentique-se e publique:

```powershell
npm login
npm publish
```

Após a publicação, qualquer pessoa poderá usar:

```powershell
npx create-sette-ts@latest meu-projeto
```

Ou, no formato `npm create`:

```powershell
npm create sette-ts@latest meu-projeto
```
