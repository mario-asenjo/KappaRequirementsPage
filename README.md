# Kappa Progress Tracker

Este repositorio contiene una aplicación SPA escrita en **React** (con Vite y TypeScript) que ayuda a seguir el progreso de las misiones de Escape from Tarkov necesarias para obtener la caja **Kappa**. La interfaz se ha diseñado con foco en la simplicidad y la usabilidad, superando la experiencia de páginas existentes que obligan a actualizar manualmente cada misión.

## Características

- **Vista por comerciantes**: filtra las misiones por comerciante y muestra el número de misiones completadas y totales de cada uno.
- **Seguimiento persistente**: las misiones marcadas como completadas se guardan en `localStorage` para que tu progreso persista entre sesiones sin necesidad de registrarse.
- **Resumen global de Kappa**: una barra de progreso en la cabecera indica cuántas misiones que cuentan para Kappa has completado y cuál es el avance total.
- **Página de detalle**: cada misión tiene una página dedicada con su descripción, objetivos, prerrequisitos y recompensas.

## Estructura del proyecto

```
kappa-tracker/
├── index.html          Página HTML de entrada que carga la aplicación
├── package.json        Dependencias y scripts de npm
├── vite.config.ts      Configuración de Vite para React
├── tsconfig*.json      Configuración de TypeScript
├── public/
│   └── favicon.svg     Ícono de la aplicación
├── src/
│   ├── main.tsx        Punto de entrada de React
│   ├── App.tsx         Estructura principal con rutas y layout
│   ├── types.ts        Definición de tipos para las misiones
│   ├── hooks/
│   │   └── useLocalStorage.ts Hook para persistir datos en localStorage
│   ├── components/     Componentes reutilizables (Header, Sidebar, TaskCard)
│   ├── pages/          Vistas de alto nivel (Home, QuestListPage, QuestDetailPage)
│   └── data/
│       └── tasks.json  Base de datos de misiones (ejemplo)
└── scripts/
    └── fetchTasks.ts   Script opcional para actualizar las misiones desde una API
```

## Primeros pasos

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Ejecutar en modo desarrollo**
   ```bash
   npm run dev
   ```
   Esto levantará la aplicación en `http://localhost:5173`. Cualquier cambio en los archivos `src/` recargará la página automáticamente.

3. **Construir para producción**
   ```bash
   npm run build
   ```
   El resultado se generará en el directorio `dist/`, listo para desplegarse en Cloudflare Pages o cualquier hosting estático.

## Actualizar la lista de misiones

El archivo `src/data/tasks.json` contiene un ejemplo de misiones. Para actualizarlo de forma automática se puede crear un script que consulte la API pública de [tarkov.dev](https://api.tarkov.dev/graphql) o bien haga scraping de la wiki oficial. El archivo `scripts/fetchTasks.ts` incluye un ejemplo básico de cómo podría implementarse esta descarga mediante GraphQL. Para usarlo:

```bash
node scripts/fetchTasks.ts
```

Esto sobrescribirá `src/data/tasks.json` con los datos más recientes. Por defecto el script no se ejecuta automáticamente; deberás lanzarlo manualmente cuando quieras actualizar la base de datos. Asegúrate de que `node-fetch` o cualquier librería necesaria esté instalada en tu entorno de desarrollo.

## Despliegue en Cloudflare Pages

1. Conecta este repositorio a Cloudflare Pages y selecciona la rama `main` para desplegar.
2. Configura el _build command_ como `npm run build` y el _output directory_ como `dist` (debería ser el valor por defecto).
3. No es necesario configurar variables de entorno para la parte de frontend. Si añades automatización de scraping que requiera variables (por ejemplo, API keys), defínelas en el dashboard de Cloudflare.

## Nota sobre scraping y API

Actualmente el proyecto incluye una pequeña selección de misiones de ejemplo. Para una cobertura completa será necesario hacer scraping de la wiki de Fandom o consumir una API como `tarkov.dev`. Debido a las protecciones de Cloudflare, los scrapers necesitan ejecutarse en un entorno que soporte JavaScript y manejar los desafíos de Cloudflare (por ejemplo, usando Puppeteer/Playwright). Esto se deja como tarea futura y no afecta al funcionamiento básico de la aplicación.
