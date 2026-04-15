# Levantamiento de Cargos Front

Extraccion del nodo `Code - HTML Front` del workflow de n8n a archivos reales para poder:

- versionarlo en GitHub
- revisar cambios sin editar un string gigante dentro de n8n
- publicar el frontend fuera del workflow

## Estructura

- `index.html`: marcado principal
- `styles.css`: estilos extraidos del bloque `<style>`
- `app.js`: logica de interfaz y llamadas a webhooks
- `assets/logo.jpeg`: logo extraido del `data:` URI original

## Dependencias externas

El frontend sigue usando:

- Tailwind CDN
- Google Fonts
- Webhooks de n8n definidos dentro de `app.js`

## Ejecutar localmente

Por ser un frontend estatico, basta con servir la carpeta con cualquier servidor simple.

Ejemplos:

```powershell
cd "C:\Users\josel\Downloads\Levantamiento de cargos\levantamiento-cargos-front"
python -m http.server 8080
```

Luego abre:

`http://localhost:8080`

## Siguiente paso recomendado

1. Subir esta carpeta a un repo GitHub.
2. Publicarla con GitHub Pages, Netlify o Vercel.
3. Mantener n8n solo como backend de webhooks.
4. Refactorizar exportaciones y panel admin desde archivos normales, no desde el nodo embebido.
