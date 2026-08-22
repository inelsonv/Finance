// Comprime una imagen en el navegador (canvas) y la devuelve como data URI
// (base64), lista para guardar directo en un campo de Firestore. Evitamos
// así depender de Firebase Storage (que ahora requiere plan Blaze).
export function compressImageFile(file, { maxDim = 320, startQuality = 0.72 } = {}) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("El archivo seleccionado no es una imagen"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("No se pudo procesar la imagen"));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height >= width && height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        let quality = startQuality;
        let dataUri = canvas.toDataURL("image/jpeg", quality);
        // Firestore permite hasta ~1MB por documento; nos aseguramos de
        // quedar muy por debajo, bajando la calidad si hace falta.
        while (dataUri.length > 700000 && quality > 0.3) {
          quality -= 0.1;
          dataUri = canvas.toDataURL("image/jpeg", quality);
        }
        if (dataUri.length > 900000) {
          reject(new Error("La imagen sigue siendo muy grande incluso comprimida. Prueba con otra foto."));
          return;
        }
        resolve(dataUri);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
