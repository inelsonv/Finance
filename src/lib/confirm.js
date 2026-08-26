// Sistema simple de confirmación global: cualquier componente puede llamar a
// confirm("¿Mensaje?") y obtiene una Promise<boolean>, sin necesidad de manejar
// su propio estado de modal. ConfirmDialogHost (montado una vez en App.jsx)
// es quien realmente renderiza el cuadro y resuelve la promesa.

let listener = null;

export function setConfirmListener(fn) {
  listener = fn;
}

export function confirm(message, options) {
  if (!listener) {
    // Respaldo por si el host todavía no montó (no debería pasar en uso normal)
    return Promise.resolve(window.confirm(message));
  }
  return listener(message, options);
}
