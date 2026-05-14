# Kappa Progress Tracker

Este repositorio contiene una aplicación SPA escrita en **React** (con Vite y TypeScript) que ayuda a seguir el progreso de las misiones de Escape from Tarkov necesarias para obtener la caja **Kappa**. La interfaz se ha diseñado con foco en la simplicidad y la usabilidad, superando la experiencia de páginas existentes que obligan a actualizar manualmente cada misión.

## Características

- **Vista por comerciantes**: filtra las misiones por comerciante y muestra el número de misiones completadas y totales de cada uno.
- **Seguimiento persistente**: las misiones marcadas como completadas se guardan en `localStorage` para que tu progreso persista entre sesiones sin necesidad de registrarse.
- **Resumen global de Kappa**: una barra de progreso en la cabecera indica cuántas misiones que cuentan para Kappa has completado y cuál es el avance total.
- **Página de detalle**: cada misión tiene una página dedicada con su descripción, objetivos, prerrequisitos y recompensas.
- **Datos sincronizables**: `src/data/tasks.json` se puede regenerar desde `tarkov.dev` con las misiones que cuentan para Kappa.
- **Estilos versionados**: Bootstrap se instala como dependencia npm y se complementa con estilos locales responsivos en `src/styles.css`.

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
│   ├── styles.css      Ajustes visuales y responsivos del layout
│   ├── types.ts        Definición de tipos para las misiones
│   ├── hooks/
│   │   └── useLocalStorage.ts Hook para persistir datos en localStorage
│   ├── components/     Componentes reutilizables (Header, Sidebar, TaskCard)
│   ├── pages/          Vistas de alto nivel (Home, QuestListPage, QuestDetailPage)
│   └── data/
│       └── tasks.json  Base de datos de misiones sincronizada desde tarkov.dev
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

El archivo `src/data/tasks.json` contiene las misiones marcadas por [tarkov.dev](https://api.tarkov.dev/graphql) como necesarias para Kappa. Para regenerarlo desde la API pública:

```bash
npm run update:tasks
```

Esto sobrescribe `src/data/tasks.json` con los datos más recientes e incluye metadata con la fuente, fecha de sincronización y total de misiones Kappa. La última sincronización registrada en este repositorio es `2026-05-14` y contiene `257` misiones Kappa.

## Despliegue en Cloudflare Pages

1. Conecta este repositorio a Cloudflare Pages y selecciona la rama `main` para desplegar.
2. Configura el _build command_ como `npm run build` y el _output directory_ como `dist` (debería ser el valor por defecto).
3. No es necesario configurar variables de entorno para la parte de frontend. Si añades automatización de scraping que requiera variables (por ejemplo, API keys), defínelas en el dashboard de Cloudflare.

## Nota sobre scraping y API

La fuente primaria del proyecto es `tarkov.dev`, que a su vez enlaza a la wiki de Fandom cuando existe una guía externa para la misión. Si en el futuro se necesita enriquecer descripciones o recompensas no expuestas por la API, el scraping de Fandom debería ejecutarse como paso separado y con control de errores para no bloquear el build.
