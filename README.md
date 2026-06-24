# curly-guacamole

> [Retour au README racine](../README.md#front-end)

[![React](https://img.shields.io/badge/React-supported-61DAFB.svg)](https://react.dev/)

Ceci est un setup minimal pour un lancement d'application React avec Vite. Pour le moment, l'administration et la gestion sont confondus dans la même interface. Par la suite, aucune administration ne sera embarquée dans l'application d'utilisation pour une séparation claire des responsabilité.

Actuellement, 2 plugins officiels sont utilisés :

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) utilise [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) utilise [SWC](https://swc.rs/)

Pour le test de l'archi et du concept, nous avons choisi de développer un POC d'un outil de Gestion Electronique de Documents (GED) intelligent, conçu pour les entreprises qui souhaitent une solution on premise ou cloud. Cet outil vise à stocker, organiser et partager des documents de manière efficace et sécurisée, tout en intégrant une IA locale pour automatiser la saisie administrative et garantir la sécurité, la portabilité et la reproductivité des données.

## Lancement du projet

Le projet est lancé par le script bash `./install.sh` et il suffit de lancer `http://localhost:5173` dans une fenêtre de navigateur pour y accéder dans l'attente du développement de l'application de bureau.

## React Compiler

Le compileur React n'est pas uitlisable pour ce template à cause de son impacte performance sur le build & dev. Pour l'ajouter, aller sur [cette documentation](https://react.dev/learn/react-compiler/installation).

## Configuration des linters

Lors du développement de l'application de production, il faudra adapter la configuration pour activer les rôles `type-aware` :

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

Vous pouvez aussi installer [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) et [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) pour les lint rôles React-specific :

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

> [Retour au README racine](../README.md#front-end)
