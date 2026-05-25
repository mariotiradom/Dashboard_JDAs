# Manual de Actualización del Dashboard JDA

Este documento está diseñado para que cualquier persona, sin necesidad de conocimientos profundos en programación, pueda actualizar la base de datos del **Dashboard JDA** al finalizar un ciclo académico.

## 1. Preparar la Base de Datos (CSV)
El sistema requiere que descargues la nueva data desde el sistema de tu universidad en formato **CSV** (Valores Separados por Comas).

1. Guarda tu nuevo archivo `.csv` dentro de la carpeta `DataBase/` que se encuentra en la raíz del proyecto.
   > [!TIP]
   > Asegúrate de que el archivo CSV mantenga exactamente la misma estructura de columnas que los ciclos anteriores (Código de Curso, Nombre Curso, Sección, Docente, Matriculados, etc.).

## 2. Actualizar el Código del Script (Solo si cambia el nombre del archivo)
El proyecto utiliza un script llamado `process_csv.cjs` para unir todos tus archivos CSV y convertirlos en el archivo maestro que usa la web (`survey_data_v2.json`).

1. Abre el archivo `process_csv.cjs` con cualquier editor de texto o código (como VS Code).
2. Ve a la línea donde están listados los archivos a procesar (usualmente cerca del inicio, en una variable llamada `const files = [...]`).
3. **Agrega el nombre de tu nuevo archivo** a la lista. Por ejemplo:
```javascript
const files = [
  'DataBase/DB 24-1.csv',
  'DataBase/DB 24-2.csv',
  'DataBase/DB 25-1.csv',
  'DataBase/DB 25-2.csv',
  'DataBase/DB 26-1.csv',
  'DataBase/DB 26-2.csv' // <- AÑADES ESTA LÍNEA
];
```

## 3. Procesar los Datos
Una vez que el archivo está en la carpeta y listado en el código, debes procesarlo:

1. Abre la Terminal o Consola (en VS Code, presiona `` Ctrl + ` `` o ve a `Terminal > New Terminal`).
2. Asegúrate de estar en la carpeta raíz del proyecto (`Dashboard JDA`).
3. Ejecuta el siguiente comando y presiona Enter:
```bash
node process_csv.cjs
```
> [!IMPORTANT]
> Este script tomará todos tus CSVs, calculará los promedios y limpiará los datos, y finalmente sobreescribirá el archivo `public/survey_data_v2.json`. Deberías ver un mensaje en verde que dice "File saved to public/survey_data_v2.json".

## 4. Desplegar los Cambios (Vercel)
Tu dashboard está sincronizado con **GitHub** y **Vercel**. Esto significa que solo debes subir el nuevo código a tu repositorio para que la página web en internet se actualice solita.

1. En tu terminal de VS Code, ejecuta los siguientes 3 comandos (uno por uno):
```bash
git add .
git commit -m "Actualizando BD con el nuevo ciclo"
git push
```
2. **¡Listo!** Vercel detectará el nuevo archivo `survey_data_v2.json` en tu GitHub y actualizará la página automáticamente en un par de minutos.

---

## ⚙️ ¿Cómo funciona la Lógica de los Ciclos? (Avanzado)
El dashboard tiene una función inteligente para no sobrecargar la pantalla:
- **Solo muestra los últimos 4 ciclos**. Al momento de leer la data, el código ordena los ciclos del más nuevo al más viejo, y descarta visualmente los antiguos, **siempre excluyendo 2024 de la vista**. 
- Por ejemplo, si subes el `27-1`, el menú desplegable automáticamente eliminará el `25-1` y mostrará `27-1, 26-2, 26-1, 25-2`.
- **Los cálculos estadísticos son inmunes a esto:** Aunque un ciclo antiguo ya no se muestre en los menús desplegables ni en las tablas detalladas (como los de 2024 o 2025), **sus datos sí son utilizados en segundo plano** para que el Promedio Histórico del docente y la alerta de Valores Atípicos (Outliers) tengan un historial gigante y súper preciso con el paso de los años. No tienes que tocar ni una sola línea de código para que esta magia suceda.
