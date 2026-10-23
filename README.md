# Templo de las Sombras

Aventura de plataformas 2D jugable sin conexión y sin instalar programas. El proyecto incluye cuatro niveles independientes, trampas, enemigos, fragmentos coleccionables, recompensas por nivel, vidas, límite de tiempo de dos minutos por nivel y un indicador del progreso de la expedición.

## Jugar

1. Extrae el ZIP en cualquier computadora.
2. Abre `index.html` con Chrome, Firefox, Edge o Safari actualizado.
3. Pulsa **Comenzar aventura**.

No requiere servidor, cuenta ni conexión a Internet. La tipografía externa es decorativa; el juego y sus controles siguen funcionando sin conexión. El récord se guarda en el almacenamiento local del navegador.

## Publicar y compartir con el instructor

El proyecto está preparado para publicarse gratis con GitHub Pages. El instructor recibirá un enlace y no tendrá que descargar archivos, abrir carpetas ni tener una cuenta de GitHub. Para usar GitHub Pages gratis, el repositorio debe ser público.

### Primera publicación

1. Inicia sesión en [GitHub](https://github.com/) y crea un repositorio nuevo. Ponle un nombre sencillo, por ejemplo `templo-de-las-sombras`, y selecciona **Público**. No agregues un README desde GitHub si ya vas a subir este proyecto con su propio README.
2. Sube los archivos del proyecto a la raíz del repositorio: `index.html`, `README.md` y las carpetas `css` y `js`. Puedes hacerlo desde **Add file → Upload files**, arrastrando los archivos y carpetas; también puedes usar GitHub Desktop o Git.
3. En el repositorio, abre **Settings → Pages**. En **Build and deployment**, selecciona **Deploy from a branch**. En **Branch**, elige `main` y la carpeta `/(root)`; pulsa **Save**.
4. Espera unos minutos y vuelve a **Settings → Pages**. Ahí aparecerá el enlace del juego, con este formato: `https://TU-USUARIO.github.io/templo-de-las-sombras/`. Ábrelo para comprobar que carga y pulsa **Comenzar aventura**.
5. Comparte ese enlace con el instructor. Solo necesita abrirlo en un navegador actualizado.

La primera publicación puede tardar unos minutos. Si el repositorio tiene otro nombre, reemplaza `templo-de-las-sombras` en el enlace por el nombre exacto del repositorio.

### Actualizar el juego

Cuando hagas cambios, sube los archivos actualizados a la rama `main`. GitHub Pages volverá a publicarlo automáticamente; comparte el mismo enlace, que no cambia.

### Instrucciones para jugar

1. Abre el enlace compartido y pulsa **Comenzar aventura**.
2. Usa **← / →** o **A / D** para caminar; **Espacio**, **↑** o **W** para saltar.
3. Pulsa **X** o **Shift** para impulsarte y **Esc** o **Ⅱ** para pausar.
4. Reúne los tres fragmentos de cada nivel y alcanza el portal antes de que se agote el tiempo. Evita los pinchos y enemigos.

El progreso y el récord se guardan en el navegador y dispositivo de cada jugador.

Para entrar directamente a jugar sin pasar por la portada ni las instrucciones, comparte este enlace: `https://jhersonquispellantoy20-cpu.github.io/templo-de-las-sombras/?jugar=1`.

## Controles

- **← / →** o **A / D**: caminar.
- **Espacio**, **↑** o **W**: saltar.
- **X** o **Shift**: impulso para esquivar; tiene tiempo de recarga.
- **Esc** o el botón **Ⅱ**: pausar y continuar.

## Objetivo y recompensas

Reúne los tres fragmentos de cada nivel para abrir el portal antes de que termine el límite de 2 minutos. Si el tiempo se agota, pierdes una vida y reinicias el nivel. Evita los pinchos y enemigos; el jugador empieza con tres vidas. Si las pierdes todas, puedes reintentar el nivel actual con tres vidas nuevas; los niveles superados y los puntos de la expedición se conservan.

El panel bajo el juego muestra los niveles superados, el nivel actual y los pendientes. Al completar una etapa recibes 150 puntos, 50 por fragmento y 2 puntos por cada segundo que quede. Superar los niveles 2 y 4 también otorga una vida adicional, hasta un máximo de cinco. El aviso entre niveles muestra el desglose de la recompensa obtenida.

## Estructura modular

- `index.html`: interfaz y punto de entrada.
- `css/game.css`: presentación adaptable a escritorio y móvil.
- `js/game.js`: controles, físicas, colisiones, HUD, puntuación y progresión.
- `js/levels.js`: mapas, plataformas, trampas, fragmentos y enemigos. Los niveles se editan sin cambiar las mecánicas.

## Colaboración con GitHub

Mantengan `main` estable y no hagan commits directos a esa rama. Usen ramas como `feature/movimiento-jugador`, `feature/nivel-1`, `feature/nivel-2` y `feature/interfaz-menu`; integren mediante Pull Request revisado por un compañero. En cada PR incluyan una descripción y una captura o GIF. En GitHub Projects organicen el trabajo en **To Do**, **In Progress**, **In Review** y **Done**, y creen issues por nivel y mecánica con su responsable.

Los niveles viven en `js/levels.js`; la lógica del jugador y el avance están aislados en `js/game.js`. Al editar mapas, revisen únicamente las entradas del nivel correspondiente y prueben el inicio, la recolección de los tres fragmentos y el portal.
